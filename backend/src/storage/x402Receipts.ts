import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DATA_DIR } from "../config.js";

// Comprobantes de cobros x402 liquidados en la tesorería. Son la entrada del
// job de liquidación híbrida de Fase 3: la tesorería recibe con el esquema
// estándar y luego el backend invoca pay() para conservar el split.
// Append-only (JSONL) por las mismas razones que el registro de pagos.
export interface X402Receipt {
  resource: string;
  amount: string;
  payer: string | null;
  transaction: string | null;
  settledAt: string;
  distributed: boolean; // ya repartido vía pay()
}

const FILE = join(DATA_DIR, "x402-receipts.jsonl");

function readAll(): X402Receipt[] {
  if (!existsSync(FILE)) return [];
  const receipts: X402Receipt[] = [];
  for (const line of readFileSync(FILE, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      receipts.push(JSON.parse(line) as X402Receipt);
    } catch {
      console.error("Comprobante x402 ilegible, se omite esa línea");
    }
  }
  return receipts;
}

export function recordReceipt(receipt: X402Receipt): void {
  mkdirSync(dirname(FILE), { recursive: true });
  appendFileSync(FILE, `${JSON.stringify(receipt)}\n`);
}

export function listPendingReceipts(): X402Receipt[] {
  return readAll().filter((r) => !r.distributed);
}

// Un pago x402 solo puede canjearse una vez: sin esto, reenviar la misma
// cabecera X-PAYMENT podría entregar el recurso varias veces si el facilitador
// responde de forma idempotente sobre una transacción ya liquidada.
export function isTransactionRedeemed(transaction: string): boolean {
  return readAll().some((r) => r.transaction === transaction);
}
