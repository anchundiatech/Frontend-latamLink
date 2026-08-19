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
  isX402Configured,
  loadPlatformOwner,
  loadRelayer,
} from "./config.js";
import { requireOperator } from "./http/auth.js";
import { cors } from "./http/cors.js";
import { rateLimit } from "./http/rateLimit.js";
import {
  ConfirmationTimeoutError,
  buildPayTransaction,
  buildRelayerSignedTransaction,
  submitSignedTransaction,
} from "./relayer/service.js";
import { createMerchant } from "./merchants/service.js";
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
  app.post("/merchants", operatorOnly, async (req, res) => {
    try {
      const body = req.body ?? {};
      const {
        paymentTokenMint,
        destinations,
        percentages,
        posTerminalId,
        feeBps,
        posFeeBps,
        minPaymentAmount,
      } = body;

      if (
        typeof paymentTokenMint !== "string" ||
        !Array.isArray(destinations) ||
        !destinations.every((d: unknown) => typeof d === "string") ||
        !Array.isArray(percentages) ||
        !percentages.every((p: unknown) => typeof p === "number") ||
        typeof posTerminalId !== "string" ||
        typeof feeBps !== "number" ||
        typeof posFeeBps !== "number" ||
        (typeof minPaymentAmount !== "string" && typeof minPaymentAmount !== "number")
      ) {
        res.status(400).json({
          error:
            "Requeridos: paymentTokenMint, destinations[], percentages[], posTerminalId, feeBps, posFeeBps, minPaymentAmount",
        });
        return;
      }

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

  // Paso 1 del flujo gasless: la app pide la tx armada para que el usuario
  // firme su parte con Privy (signTransaction, NO send).
  app.post("/payments/build", async (req, res) => {
    try {
      const { merchantAddress, payerPubkey, amount } = req.body ?? {};
      if (
        typeof merchantAddress !== "string" ||
        typeof payerPubkey !== "string" ||
        (typeof amount !== "string" && typeof amount !== "number")
      ) {
        res.status(400).json({ error: "merchantAddress, payerPubkey y amount son requeridos" });
        return;
      }
      const result = await buildPayTransaction(connection, relayer.publicKey, {
        merchantAddress,
        payerPubkey,
        amount: BigInt(amount),
      });
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: (err as Error).message });
    }
  });

  // Cobro por QR (Solana Pay, modo "transaction request"): devuelve la
  // transacción ya firmada por el relayer para que la billetera del cliente
  // solo añada su firma y la envíe. El pago pasa por `pay()`, así que conserva
  // el split y las comisiones, y el cliente no necesita SOL.
  app.post("/payments/solana-pay", async (req, res) => {
    try {
      const { merchantAddress, payerPubkey, amount, reference } = req.body ?? {};
      if (
        typeof merchantAddress !== "string" ||
        typeof payerPubkey !== "string" ||
        (typeof amount !== "string" && typeof amount !== "number")
      ) {
        res.status(400).json({ error: "merchantAddress, payerPubkey y amount son requeridos" });
        return;
      }
      if (reference !== undefined && typeof reference !== "string") {
        res.status(400).json({ error: "reference debe ser string" });
        return;
      }
      const result = await buildRelayerSignedTransaction(connection, relayer, {
        merchantAddress,
        payerPubkey,
        amount: BigInt(amount),
        reference,
      });
      res.json(result);
    } catch (err) {
      res.status(422).json({ error: (err as Error).message });
    }
  });

  // Paso 2: recibe la tx parcialmente firmada, valida, firma como fee_payer y envía.
  app.post("/payments/submit", async (req, res) => {
    const { transaction, reference } = req.body ?? {};
    if (typeof transaction !== "string") {
      res.status(400).json({ error: "transaction (base64) es requerida" });
      return;
    }
    if (reference !== undefined && typeof reference !== "string") {
      res.status(400).json({ error: "reference debe ser string" });
      return;
    }

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
      const result = await submitSignedTransaction(connection, relayer, transaction, (info) =>
        persist(info, "pending", null),
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
  app.get("/payments", operatorOnly, (req, res) => {
    const { merchant, reference, limit } = req.query;
    res.json({
      payments: listPayments({
        merchant: typeof merchant === "string" ? merchant : undefined,
        reference: typeof reference === "string" ? reference : undefined,
        limit: typeof limit === "string" ? Number(limit) : undefined,
      }),
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
