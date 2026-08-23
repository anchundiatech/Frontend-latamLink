import { prisma } from "../lib/prisma.js";

// Registro de pagos para conciliación contable (informe 2.3.E): liga la firma
// on-chain con la referencia off-chain del QR.
//
// Append-only en Postgres (tabla relayer_payment_log): nunca se actualiza una
// fila. Dos pagos simultáneos no pueden pisarse y "pending" → "confirmed" se
// resuelve tomando el registro más reciente por signature, igual que antes
// con el archivo JSONL que reemplaza este módulo.
export type PaymentStatus = "pending" | "confirmed";

export interface PaymentRecord {
  signature: string;
  slot: number | null;
  merchant: string;
  payer: string;
  amount: string;
  reference: string | null;
  status: PaymentStatus;
  createdAt: string;
}

export async function recordPayment(record: PaymentRecord): Promise<void> {
  await prisma.relayerPaymentLog.create({
    data: {
      signature: record.signature,
      slot: record.slot,
      merchant: record.merchant,
      payer: record.payer,
      amount: record.amount,
      reference: record.reference,
      status: record.status === "confirmed" ? "CONFIRMED" : "PENDING",
      createdAt: new Date(record.createdAt),
    },
  });
}

interface PaymentRecordRow {
  signature: string;
  slot: number | null;
  merchant: string;
  payer: string;
  amount: string;
  reference: string | null;
  status: "PENDING" | "CONFIRMED";
  createdAt: Date;
}

// El último registro de cada firma manda: así "pending" → "confirmed" queda
// resuelto sin reescribir nada.
function latestBySignature(records: PaymentRecordRow[]): PaymentRecordRow[] {
  const bySignature = new Map<string, PaymentRecordRow>();
  for (const record of records) bySignature.set(record.signature, record);
  return [...bySignature.values()];
}

export async function listPayments(filter?: {
  merchant?: string;
  reference?: string;
  limit?: number;
}): Promise<PaymentRecord[]> {
  const rows = await prisma.relayerPaymentLog.findMany({
    where: {
      merchant: filter?.merchant,
      reference: filter?.reference,
    },
    orderBy: { createdAt: "asc" },
  });

  const records = latestBySignature(rows).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Un `limit` inválido (NaN, 0, negativo) devolvía el histórico completo.
  const requested = filter?.limit;
  const limit =
    typeof requested === "number" && Number.isFinite(requested) && requested > 0
      ? Math.min(Math.floor(requested), 200)
      : 50;

  return records.slice(0, limit).map((r) => ({
    signature: r.signature,
    slot: r.slot,
    merchant: r.merchant,
    payer: r.payer,
    amount: r.amount,
    reference: r.reference,
    status: r.status === "CONFIRMED" ? "confirmed" : "pending",
    createdAt: r.createdAt.toISOString(),
  }));
}
