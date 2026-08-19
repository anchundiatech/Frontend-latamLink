import { Router, type Request } from "express";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  PUBLIC_BASE_URL,
  X402_ASSET,
  X402_FACILITATOR_URL,
  X402_NETWORK,
  X402_PRICE_QR,
  X402_PRICE_STATS,
  X402_TREASURY,
} from "../config.js";
import { fetchMerchant, type MerchantState } from "../solana/merchant.js";
import { listPayments } from "../storage/payments.js";
import { isTransactionRedeemed, recordReceipt } from "../storage/x402Receipts.js";
import { httpFacilitator } from "./facilitator.js";
import { requirePayment, type PreconditionResult } from "./middleware.js";

// El comercio resuelto en la precondición se reutiliza en el handler para no
// pagar dos veces el mismo RPC.
const resolvedMerchants = new WeakMap<Request, MerchantState>();

// Recursos monetizados de la plataforma (informe, Parte 3.3 — PRO 1):
// generación programática de QRs y consulta de estadísticas, cobrados por
// request en USDC sin API keys ni suscripciones.
export function createX402Router(connection: Connection): Router {
  const router = Router();
  const facilitator = httpFacilitator(X402_FACILITATOR_URL);

  const paywall = (
    price: string,
    description: string,
    precondition: (req: Request) => Promise<PreconditionResult>,
  ) =>
    requirePayment({
      facilitator,
      baseUrl: PUBLIC_BASE_URL,
      network: X402_NETWORK,
      asset: X402_ASSET,
      payTo: X402_TREASURY,
      price,
      description,
      precondition,
      isRedeemed: isTransactionRedeemed,
      onSettled: (receipt) => {
        try {
          recordReceipt({ ...receipt, settledAt: new Date().toISOString(), distributed: false });
        } catch (err) {
          console.error("No se pudo registrar el comprobante x402:", err);
        }
      },
    });

  async function resolveMerchant(
    req: Request,
    address: unknown,
  ): Promise<PreconditionResult> {
    if (typeof address !== "string") {
      return { ok: false, status: 400, error: "Falta la dirección del comercio" };
    }
    let key: PublicKey;
    try {
      key = new PublicKey(address);
    } catch {
      return { ok: false, status: 400, error: "Dirección de comercio inválida" };
    }
    try {
      resolvedMerchants.set(req, await fetchMerchant(connection, key));
      return { ok: true };
    } catch (err) {
      return { ok: false, status: 422, error: (err as Error).message };
    }
  }

  // QR de cobro para un comercio. Devuelve una URL Solana Pay en modo
  // "transaction request": el wallet la resuelve contra /payments/build, así
  // el cobro pasa por pay() y conserva el split (no es una transferencia suelta).
  router.post(
    "/qr",
    paywall(X402_PRICE_QR, "Generación de QR de cobro LatamLink", async (req) => {
      const { merchantAddress, amount } = req.body ?? {};
      if (typeof amount !== "string" && typeof amount !== "number") {
        return { ok: false, status: 400, error: "amount es requerido" };
      }
      let amountRaw: bigint;
      try {
        amountRaw = BigInt(amount);
      } catch {
        return { ok: false, status: 400, error: "amount debe ser un entero" };
      }
      const resolved = await resolveMerchant(req, merchantAddress);
      if (!resolved.ok) return resolved;

      const merchant = resolvedMerchants.get(req)!;
      if (!merchant.isActive) {
        return { ok: false, status: 422, error: "El comercio está inactivo" };
      }
      if (amountRaw < merchant.minPaymentAmount) {
        return {
          ok: false,
          status: 422,
          error: `Monto ${amountRaw} menor al mínimo ${merchant.minPaymentAmount}`,
        };
      }
      return { ok: true };
    }),
    (req, res) => {
      const merchant = resolvedMerchants.get(req)!;
      const { merchantAddress, amount, label, message } = req.body;
      const amountRaw = BigInt(amount);

      // Referencia off-chain para conciliar el cobro con la tx on-chain.
      const reference = Keypair.generate().publicKey.toBase58();
      const requestUrl = new URL(`${PUBLIC_BASE_URL}/payments/build`);
      requestUrl.searchParams.set("merchant", merchantAddress);
      requestUrl.searchParams.set("amount", amountRaw.toString());
      requestUrl.searchParams.set("reference", reference);

      res.json({
        solanaPayUrl: `solana:${encodeURIComponent(requestUrl.toString())}`,
        reference,
        merchant: merchantAddress,
        amount: amountRaw.toString(),
        paymentTokenMint: merchant.paymentTokenMint.toBase58(),
        label: typeof label === "string" ? label : "LatamLink Pay",
        message: typeof message === "string" ? message : undefined,
      });
    },
  );

  // Estadísticas y conciliación de un comercio.
  router.get(
    "/merchants/:address/stats",
    paywall(X402_PRICE_STATS, "Estadísticas de comercio LatamLink", (req) =>
      resolveMerchant(req, req.params.address),
    ),
    (req, res) => {
      const merchant = resolvedMerchants.get(req)!;
      const address = merchant.address.toBase58();
      res.json({
        merchant: address,
        isActive: merchant.isActive,
        posTerminalId: merchant.posTerminalId,
        destinations: merchant.destinations.map((d) => d.toBase58()),
        percentages: merchant.percentages,
        feeBps: merchant.feeBps,
        posFeeBps: merchant.posFeeBps,
        minPaymentAmount: merchant.minPaymentAmount.toString(),
        totalPaymentsReceived: merchant.totalPaymentsReceived.toString(),
        totalVolume: merchant.totalVolume.toString(),
        recentPayments: listPayments({ merchant: address, limit: 10 }),
      });
    },
  );

  return router;
}
