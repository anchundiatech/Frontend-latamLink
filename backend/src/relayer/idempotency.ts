// Cache de idempotencia en memoria (MVP, como el anti-replay y el límite
// diario en validate.ts). Sin esto, un doble tap o un reintento de red del
// cliente en /payments/build o /payments/solana-pay arma dos transacciones
// independientes —cada una con su propio blockhash y, en el caso de
// solana-pay, potencialmente confirmable por separado— y el comercio termina
// cobrando dos veces por la misma intención de pago.
const IDEMPOTENCY_TTL_MS = 120_000;
const MAX_IDEMPOTENCY_ENTRIES = 10_000;

interface CachedEntry {
  promise: Promise<unknown>;
  expiresAt: number;
}

const cache = new Map<string, CachedEntry>();

function purgeExpired(now: number): void {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

/**
 * Devuelve el resultado cacheado para `key` si todavía es válido, o ejecuta
 * `build` y cachea su promesa. Cachear la promesa —no solo el resultado ya
 * resuelto— es lo que colapsa dos requests casi simultáneos (doble tap) en
 * una sola ejecución real, en vez de dejar que ambos terminen de construir su
 * propia transacción antes de que el primero responda.
 */
export function withIdempotency<T>(key: string, build: () => Promise<T>): Promise<T> {
  const now = Date.now();
  if (cache.size > MAX_IDEMPOTENCY_ENTRIES) purgeExpired(now);

  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.promise as Promise<T>;
  }

  const promise = build();
  cache.set(key, { promise, expiresAt: now + IDEMPOTENCY_TTL_MS });

  // Un fallo (RPC caído, merchant inválido, lo que sea) no debe quedar
  // pegado a la clave: un reintento legítimo después de un error transitorio
  // tiene que poder volver a intentar de cero, no recibir el mismo error para
  // siempre hasta que expire el TTL.
  promise.catch(() => cache.delete(key));

  return promise;
}
