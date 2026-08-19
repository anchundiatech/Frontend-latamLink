# Spec técnico — Capa x402 de LatamLink Pay (Fases 2 y 3)

Estado: **Fase 2 IMPLEMENTADA** (2026-08-18) en `backend/src/x402/`; falta
elegir y configurar el facilitador para activarla. Fase 3 (job de liquidación
híbrida) sigue en diseño.

| Pieza | Archivo | Estado |
|---|---|---|
| Tipos del protocolo (`PaymentRequirements`, payload, verify/settle) | `src/x402/types.ts` | ✅ |
| Cliente del facilitador con degradación (timeout, 5xx → 503) | `src/x402/facilitator.ts` | ✅ |
| Middleware de cobro (402 → verify → settle → recurso) | `src/x402/middleware.ts` | ✅ |
| Recursos cobrables (`/x402/qr`, `/x402/merchants/:address/stats`) | `src/x402/routes.ts` | ✅ |
| Comprobantes para la liquidación híbrida | `src/storage/x402Receipts.ts` | ✅ |
| Tests de la invariante "sin pago no hay recurso" | `tests/x402.test.ts` | ✅ 6 casos |
| Elección del facilitador | — | ❌ Decisión abierta |
| Job de reparto vía `pay()` (Fase 3) | — | ❌ Pendiente |

## Decisión ya tomada
**Liquidación híbrida**: los cobros x402 entran con el esquema estándar
(`exact` sobre Solana, USDC → tesorería intermedia), compatible con
facilitadores públicos; luego un job del backend invoca `pay()` del contrato
para repartir conservando el split de comisiones. Razón: interoperabilidad
total con el ecosistema x402 sin renunciar al modelo de comisiones on-chain.

## Fase 2 — Endpoints x402 estándar (devnet)

### Recursos cobrables (v1)
| Endpoint | Precio sugerido | Qué entrega |
|---|---|---|
| `POST /x402/qr` | 0.001 USDC | Genera payload de QR de cobro para un merchant |
| `GET /x402/merchants/:address/stats` | 0.005 USDC | Estadísticas on-chain del merchant (volumen, pagos, split) |

### Flujo
1. Cliente/agente hace request sin pago → respuesta `402 Payment Required` con
   `PaymentRequirements` (scheme `exact`, network Solana devnet, asset USDC,
   `payTo` = tesorería, monto, expiración).
2. Cliente arma el pago, reintenta con header `X-PAYMENT`.
3. Backend verifica vía **facilitador** (verify) y liquida (settle).
4. Respuesta `200` con el recurso + `X-PAYMENT-RESPONSE`.

### Implementación (tal como quedó)
- Middleware propio (`src/x402/middleware.ts`) montado bajo `/x402/*` sobre el
  mismo servidor Express del relayer: la capa de pagos queda desacoplada del
  resto de rutas. Se implementó a mano en lugar de usar `x402-express` para no
  atarse a la versión de un paquete en una pieza que decide si se entrega o no
  un recurso pago, y para poder testear cada rama del flujo.
- Configuración por entorno: `X402_FACILITATOR_URL`, `X402_TREASURY`,
  `X402_ASSET`, `X402_NETWORK`, `X402_PRICE_QR`, `X402_PRICE_STATS`. Si falta
  cualquiera de las tres primeras, la capa **no se monta** (responde 503): no se
  expone un paywall incapaz de verificar pagos.
- Facilitador: a elegir (decisión abierta). El cliente HTTP ya implementa
  `POST /verify` y `POST /settle` del estándar, con timeout de 10 s.
- Tesorería: cuenta dedicada (`X402_TREASURY`), distinta del relayer.
- Regla dura verificada por tests: el recurso JAMÁS se entrega sin `verify`
  **y** `settle` exitosos. Header ilegible, pago inválido o liquidación fallida
  → 402; facilitador caído → `503` + `Retry-After`. Nunca hay fallback silencioso.
- El QR que devuelve `/x402/qr` es una URL de Solana Pay en modo *transaction
  request* apuntando a `/payments/build`: así el cobro pasa por `pay()` y
  conserva el split, en lugar de ser una transferencia suelta.

## Fase 3 — Liquidación híbrida (settlement job)

1. Los cobros x402 se registran (tx signature, monto, endpoint, pagador,
   timestamp, `distributed`) — ya implementado en `src/storage/x402Receipts.ts`;
   `listPendingReceipts()` es la entrada del job.
2. Job periódico (cron) barre la tesorería: cuando el acumulado supera un
   umbral configurable, ejecuta `pay(total)` contra un **merchant interno
   "plataforma"** cuyo split representa la distribución de ingresos del negocio
   (los destinos/porcentajes los define el humano — decisión de producto).
3. La tesorería firma como `payer` de `pay()`; el relayer sigue siendo el
   `fee_payer` (mismo pipeline de la Fase 1, reutilizado tal cual).
4. Conciliación: recibo x402 ↔ evento `PaymentProcessed` del settlement,
   persistidos juntos.

### Por qué un merchant interno
Reutiliza el contrato desplegado sin modificarlo: el split de ingresos x402
queda on-chain, auditable y con los mismos eventos que el resto del negocio.

## No-objetivos (para no sobre-ingeniar)
- x402 NO reemplaza el flujo QR presencial (eso es contrato + Privy + relayer).
- x402 NO resuelve el gas: el gasless sigue viniendo del relayer.
- Nada de mainnet hasta que devnet esté estable y el humano lo pida.

## Métricas de la fase (para su loop futuro `/loop-x402-devnet`)
- Latencia del ciclo 402 → pago → 200 (objetivo inicial: p50 < 4s en devnet).
- Guarda: 0 entregas de recurso sin pago verificado (invariante absoluta).
