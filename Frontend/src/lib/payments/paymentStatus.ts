// Único lugar de verdad para el estado de un cobro en curso. useSolanaPay,
// PaymentStatus.tsx, POSPage y useTxStore compartían cada uno su propia copia
// de este literal union; una copia desincronizada (por ejemplo al agregar un
// estado nuevo) podía dejar de compilar en un solo lugar y no en los demás.
export type PaymentStatus = "idle" | "pending" | "confirmed" | "failed"

// Estado que puede emitir el watcher de pago: nunca vuelve a "idle" una vez
// que arrancó a mirar la cadena.
export type WatcherStatus = Exclude<PaymentStatus, "idle">

// Ventana del watcher de pago (intentos x intervalo). El conteo regresivo de
// POSPage y el timeout real de watchForPayment deben leer de acá: antes eran
// dos números hardcodeados en archivos distintos que podían drift entre sí.
export const PAYMENT_WATCH_MAX_ATTEMPTS = 20
export const PAYMENT_WATCH_INTERVAL_MS = 5000
export const PAYMENT_WATCH_TIMEOUT_MS =
  PAYMENT_WATCH_MAX_ATTEMPTS * PAYMENT_WATCH_INTERVAL_MS
