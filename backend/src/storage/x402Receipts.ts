import { prisma } from "../lib/prisma.js";

// Comprobantes de cobros x402 liquidados en la tesorería. Son la entrada del
// job de liquidación híbrida de Fase 3: la tesorería recibe con el esquema
// estándar y luego el backend invoca pay() para conservar el split.
// Append-only en Postgres (tabla x402_receipt_log), igual que antes con el
// archivo JSONL que reemplaza este módulo.
export interface X402Receipt {
  resource: string;
  amount: string;
  payer: string | null;
  transaction: string | null;
  settledAt: string;
  distributed: boolean; // ya repartido vía pay()
}

export async function recordReceipt(receipt: X402Receipt): Promise<void> {
  await prisma.x402ReceiptLog.create({
    data: {
      resource: receipt.resource,
      amount: receipt.amount,
      payer: receipt.payer,
      transaction: receipt.transaction,
      settledAt: new Date(receipt.settledAt),
      distributed: receipt.distributed,
    },
  });
}

export async function listPendingReceipts(): Promise<X402Receipt[]> {
  const rows = await prisma.x402ReceiptLog.findMany({ where: { distributed: false } });
  return rows.map((r) => ({
    resource: r.resource,
    amount: r.amount,
    payer: r.payer,
    transaction: r.transaction,
    settledAt: r.settledAt.toISOString(),
    distributed: r.distributed,
  }));
}

// Un pago x402 solo puede canjearse una vez: sin esto, reenviar la misma
// cabecera X-PAYMENT podría entregar el recurso varias veces si el facilitador
// responde de forma idempotente sobre una transacción ya liquidada.
export async function isTransactionRedeemed(transaction: string): Promise<boolean> {
  const existing = await prisma.x402ReceiptLog.findFirst({
    where: { transaction },
    select: { id: true },
  });
  return existing !== null;
}
