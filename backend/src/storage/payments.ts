import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DATA_DIR } from "../config.js";

// Registro de pagos para conciliación contable (informe 2.3.E): liga la firma
// on-chain con la referencia off-chain del QR.
//
// Formato append-only (JSONL, un registro por línea): dos pagos simultáneos no
// pueden pisarse, un archivo dañado no borra el histórico y la migración a
// postgres/Supabase sigue siendo directa. Nunca se reescribe el archivo.
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

const FILE = join(DATA_DIR, "payments.jsonl");

function readAll(): PaymentRecord[] {
  if (!existsSync(FILE)) return [];
  const records: PaymentRecord[] = [];
  for (const line of readFileSync(FILE, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line) as PaymentRecord);
    } catch {
      // Una línea dañada no invalida el resto del histórico.
      console.error("Registro de pago ilegible, se omite esa línea");
    }
  }
  return records;
}

export function recordPayment(record: PaymentRecord): void {
  mkdirSync(dirname(FILE), { recursive: true });
  appendFileSync(FILE, `${JSON.stringify(record)}\n`);
}

// El último registro de cada firma manda: así "pending" → "confirmed" queda
// resuelto sin reescribir nada.
function latestBySignature(records: PaymentRecord[]): PaymentRecord[] {
  const bySignature = new Map<string, PaymentRecord>();
  for (const record of records) bySignature.set(record.signature, record);
  return [...bySignature.values()];
}

export function listPayments(filter?: {
  merchant?: string;
  reference?: string;
  limit?: number;
}): PaymentRecord[] {
  let records = latestBySignature(readAll());
  if (filter?.merchant) records = records.filter((r) => r.merchant === filter.merchant);
  if (filter?.reference) records = records.filter((r) => r.reference === filter.reference);
  records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Un `limit` inválido (NaN, 0, negativo) devolvía el histórico completo.
  const requested = filter?.limit;
  const limit =
    typeof requested === "number" && Number.isFinite(requested) && requested > 0
      ? Math.min(Math.floor(requested), 200)
      : 50;
  return records.slice(0, limit);
}
