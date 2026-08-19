import {
  FacilitatorUnavailableError,
  X402_VERSION,
  type PaymentPayload,
  type PaymentRequirements,
  type SettleResponse,
  type VerifyResponse,
} from "./types.js";

export interface Facilitator {
  verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<VerifyResponse>;
  settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<SettleResponse>;
}

const DEFAULT_TIMEOUT_MS = 10_000;

async function postJson<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      // 4xx del facilitador = pago inválido según él; 5xx = está caído.
      if (response.status >= 500) {
        throw new FacilitatorUnavailableError(
          `El facilitador respondió ${response.status}`,
        );
      }
      throw new Error(`El facilitador rechazó la solicitud (${response.status})`);
    }
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof FacilitatorUnavailableError) throw err;
    if (err instanceof Error && (err.name === "AbortError" || err.name === "TypeError")) {
      throw new FacilitatorUnavailableError(`No se pudo contactar al facilitador: ${err.message}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Cliente del facilitador público (Coinbase CDP u otro compatible). La
// verificación SIEMPRE es remota: este backend nunca da por bueno un pago
// que no confirmó el facilitador.
export function httpFacilitator(baseUrl: string, timeoutMs = DEFAULT_TIMEOUT_MS): Facilitator {
  const base = baseUrl.replace(/\/$/, "");
  return {
    verify(paymentPayload, paymentRequirements) {
      return postJson<VerifyResponse>(
        `${base}/verify`,
        { x402Version: X402_VERSION, paymentPayload, paymentRequirements },
        timeoutMs,
      );
    },
    settle(paymentPayload, paymentRequirements) {
      return postJson<SettleResponse>(
        `${base}/settle`,
        { x402Version: X402_VERSION, paymentPayload, paymentRequirements },
        timeoutMs,
      );
    },
  };
}
