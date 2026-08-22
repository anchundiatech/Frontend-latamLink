import express, { type Express } from "express";
import { existsSync, readFileSync } from "node:fs";
import {
  ADMIN_API_KEY,
  ALLOWED_ORIGINS,
  PORT,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  TRUSTED_PROXY_HOPS,
  getConnection,
  getFallbackConnections,
  isX402Configured,
  loadPlatformOwner,
  loadRelayer,
} from "./config.js";
import { requireOperator } from "./http/auth.js";
import { cors } from "./http/cors.js";
import { rateLimit } from "./http/rateLimit.js";
import { validateBody, validateQuery } from "./http/validateRequest.js";
import {
  buildPaymentSchema,
  createMerchantSchema,
  listPaymentsQuerySchema,
  payoutBuildSchema,
  payoutSubmitSchema,
  solanaPaySchema,
  submitPaymentSchema,
  updateMerchantConfigSchema,
} from "./schemas/relayerSchema.js";
import {
  ConfirmationTimeoutError,
  buildPayTransaction,
  buildRelayerSignedTransaction,
  submitSignedTransaction,
} from "./relayer/service.js";
import { withIdempotency } from "./relayer/idempotency.js";
import { createMerchant, updateMerchantConfig } from "./merchants/service.js";
import { buildPayoutTransaction, submitPayoutTransaction } from "./payouts/service.js";
import { listPayments, recordPayment } from "./storage/payments.js";
import { PROGRAM_ID } from "./solana/constants.js";
import { createX402Router } from "./x402/routes.js";

const STATE_PATH = "devnet-state.json";

interface DevnetState {
  mint?: string;
  merchantAddress?: string;
  ownerPubkey?: string;
}

function readDevnetState(): DevnetState {
  if (!existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as DevnetState;
  } catch {
    return {};
  }
}

export function createApp(): Express {
  const app = express();
  // Confiar en cualquier X-Forwarded-For dejaría el rate limiting sin efecto:
  // basta una cabecera falsa por request para estrenar contador.
  app.set("trust proxy", TRUSTED_PROXY_HOPS);
  app.use(cors(ALLOWED_ORIGINS));
  app.use(express.json({ limit: "100kb" }));
  app.use(rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX }));

  const connection = getConnection();
  const relayer = loadRelayer();
  const operatorOnly = requireOperator(ADMIN_API_KEY);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, relayer: relayer.publicKey.toBase58() });
  });

  // Config pública para el frontend: evita hardcodear direcciones en la app.
  app.get("/config", (_req, res) => {
    const state = readDevnetState();
    res.json({
      programId: PROGRAM_ID.toBase58(),
      cluster: "devnet",
      relayer: relayer.publicKey.toBase58(),
      paymentTokenMint: state.mint ?? null,
      tokenDecimals: 6,
      demoMerchant: state.merchantAddress ?? null,
      platformOwner: state.ownerPubkey ?? null,
      maxDestinations: 10,
    });
  });

  // Alta de comercio. El owner on-chain es SIEMPRE la plataforma: es la única
  // forma de que las comisiones (gas_vault + pos_fee) sean nuestras, y de que
  // el comercio no necesite SOL ni firmar nada. Ver docs/MAPA_BACKEND.md.
  // Requiere credencial de operador: cada alta gasta renta en SOL de la
  // plataforma y no existe instrucción para cerrar las cuentas creadas.
  app.post("/merchants", operatorOnly, validateBody(createMerchantSchema), async (req, res) => {
    try {
      const {
        paymentTokenMint,
        destinations,
        percentages,
        posTerminalId,
        feeBps,
        posFeeBps,
        minPaymentAmount,
      } = req.body;

      // El merchantId lo decide el servidor: que lo eligiera el cliente
      // permitía ocupar direcciones a voluntad.
      const result = await createMerchant(connection, loadPlatformOwner(), {
        paymentTokenMint,
        destinations,
        percentages,
        posTerminalId,
        feeBps,
        posFeeBps,
        minPaymentAmount: String(minPaymentAmount),
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(422).json({ error: (err as Error).message });
    }
  });

  // Actualiza la configuración de un comercio existente (reparto, comisiones,
  // monto mínimo). Firma la plataforma, que es el owner on-chain: el comerciante
  // nunca firma ni necesita SOL.
  app.patch(
    "/merchants/:address/config",
    operatorOnly,
    validateBody(updateMerchantConfigSchema),
    async (req, res) => {
    try {
      const address = req.params.address;
      if (!address) {
        res.status(400).json({ error: "Falta la dirección del comercio" });
        return;
      }

      const { destinations, percentages, feeBps, posFeeBps, minPaymentAmount } = req.body;

      const result = await updateMerchantConfig(connection, loadPlatformOwner(), address, {
        destinations,
        percentages,
        feeBps,
        posFeeBps,
        minPaymentAmount: String(minPaymentAmount),
      });
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: (err as Error).message });
    }
  });

  // Paso 1 del flujo gasless: la app pide la tx armada para que el usuario
  // firme su parte con Privy (signTransaction, NO send).
  app.post("/payments/build", validateBody(buildPaymentSchema), async (req, res) => {
    try {
      const { merchantAddress, payerPubkey, amount, idempotencyKey } = req.body;
      const build = () =>
        buildPayTransaction(connection, relayer.publicKey, {
          merchantAddress,
          payerPubkey,
          amount,
        });
      // Sin idempotencyKey el caller no puede sufrir doble cobro por reintento
      // (cada llamada es independiente a propósito, comportamiento anterior).
      const result = idempotencyKey
        ? await withIdempotency(`build:${idempotencyKey}`, build)
        : await build();
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: (err as Error).message });
    }
  });

  // Cobro por QR (Solana Pay, modo "transaction request"): devuelve la
  // transacción ya firmada por el relayer para que la billetera del cliente
  // solo añada su firma y la envíe. El pago pasa por `pay()`, así que conserva
  // el split y las comisiones, y el cliente no necesita SOL.
  app.post("/payments/solana-pay", validateBody(solanaPaySchema), async (req, res) => {
    try {
      const { merchantAddress, payerPubkey, amount, reference } = req.body;
      const build = () =>
        buildRelayerSignedTransaction(connection, relayer, {
          merchantAddress,
          payerPubkey,
          amount,
          reference,
        });
      // El reference ya es único por QR (se genera una vez y se reutiliza
      // mientras esa pantalla está viva): sirve como clave de idempotencia
      // sin pedirle un campo nuevo al cliente.
      const result = reference ? await withIdempotency(`solana-pay:${reference}`, build) : await build();
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: (err as Error).message });
    }
  });

  // Paso 2: recibe la tx parcialmente firmada, valida, firma como fee_payer y envía.
  app.post("/payments/submit", validateBody(submitPaymentSchema), async (req, res) => {
    const { transaction, reference } = req.body;

    const persist = (
      info: { signature: string; merchant: string; payer: string; amount: string },
      status: "pending" | "confirmed",
      slot: number | null,
    ): void => {
      try {
        recordPayment({
          ...info,
          slot,
          reference: reference ?? null,
          status,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error("No se pudo registrar el pago:", err);
      }
    };

    try {
      // Se registra en cuanto la transacción entra a la red: si después falla
      // la confirmación, el pago igual queda trazado y no se cobra dos veces.
      const result = await submitSignedTransaction(
        connection,
        relayer,
        transaction,
        (info) => persist(info, "pending", null),
        getFallbackConnections(),
      );
      persist(result, "confirmed", result.slot);
      res.json(result);
    } catch (err) {
      if (err instanceof ConfirmationTimeoutError) {
        // 202: la transacción existe y puede confirmarse. El cliente debe
        // consultar su estado, nunca volver a cobrar.
        res.status(202).json({
          status: "pending",
          signature: err.submitted.signature,
          error: err.message,
        });
        return;
      }
      res.status(422).json({ error: (err as Error).message });
    }
  });

  // Retiro desde la cuenta de pago del comerciante. El relayer paga la red
  // (esa cuenta no tiene SOL) y el comerciante firma, porque es su dinero.
  app.post("/payouts/build", operatorOnly, validateBody(payoutBuildSchema), async (req, res) => {
    try {
      const { ownerPubkey, mint, destination, amount, decimals } = req.body;
      const result = await buildPayoutTransaction(connection, relayer.publicKey, {
        ownerPubkey,
        mint,
        destination,
        amount,
        decimals,
      });
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: (err as Error).message });
    }
  });

  app.post("/payouts/submit", operatorOnly, validateBody(payoutSubmitSchema), async (req, res) => {
    try {
      const { transaction } = req.body;
      const result = await submitPayoutTransaction(connection, relayer, transaction);
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: (err as Error).message });
    }
  });

  // Capa x402: solo se monta con facilitador y tesorería configurados. Sin
  // ellos no habría forma de verificar un pago, y entregar el recurso sin
  // verificación está prohibido por diseño.
  if (isX402Configured()) {
    app.use("/x402", createX402Router(connection));
  } else {
    app.use("/x402", (_req, res) => {
      res.status(503).json({
        error:
          "Capa x402 no configurada: faltan X402_FACILITATOR_URL, X402_TREASURY o X402_ASSET",
      });
    });
  }

  // Conciliación para el POS/dashboard. Expone wallets y montos de terceros,
  // así que va detrás de credencial de operador.
  app.get("/payments", operatorOnly, validateQuery(listPaymentsQuerySchema), (req, res) => {
    const { merchant, reference, limit } = (req as typeof req & {
      validatedQuery: { merchant?: string; reference?: string; limit?: number };
    }).validatedQuery;
    res.json({
      payments: listPayments({ merchant, reference, limit }),
    });
  });

  return app;
}

const isMain = process.argv[1]?.endsWith("server.ts");
if (isMain) {
  createApp().listen(PORT, () => {
    console.log(`Relayer LatamLink escuchando en :${PORT}`);
  });
}
