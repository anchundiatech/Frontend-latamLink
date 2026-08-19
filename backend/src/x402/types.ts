// Tipos del protocolo x402 (HTTP 402 → X-PAYMENT → verify/settle → 200).
// Se sigue el esquema estándar "exact" para ser compatible con facilitadores
// públicos; el split de comisiones se conserva con la liquidación híbrida
// (la tesorería x402 se reparte después vía pay()). Ver docs/SPEC_X402.md.

export const X402_VERSION = 1;

export interface PaymentRequirements {
  scheme: "exact";
  network: string; // p. ej. "solana-devnet"
  maxAmountRequired: string; // unidades mínimas del token
  resource: string; // URL del recurso cobrado
  description: string;
  mimeType: string;
  payTo: string; // tesorería x402 (NO el relayer)
  maxTimeoutSeconds: number;
  asset: string; // mint del token (USDC)
  extra?: Record<string, unknown>;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: Record<string, unknown>;
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
}

export interface SettleResponse {
  success: boolean;
  errorReason?: string;
  transaction?: string;
  network?: string;
  payer?: string;
}

// Cuerpo del 402: el cliente elige uno de los `accepts` y reintenta con
// la cabecera X-PAYMENT.
export interface PaymentRequiredBody {
  x402Version: number;
  accepts: PaymentRequirements[];
  error: string;
}

// El facilitador no respondió: el recurso NO se entrega y se degrada con
// gracia (503 + Retry-After), nunca se asume el pago como válido.
export class FacilitatorUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FacilitatorUnavailableError";
  }
}
