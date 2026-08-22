# Loops de mejora del proyecto — LatamLink Pay

## El patrón (por qué funciona)
1. **Línea base medible** antes de tocar nada (evidencia reproducible, no impresión).
2. **Un solo cambio por iteración** — si cambias dos cosas y mejora, no sabes cuál fue.
3. **Re-verificación idéntica** — mismo input, misma rúbrica, mismo comando.
4. **Conservar o revertir** — nunca acumules cambios no verificados.
5. **Condiciones de parada explícitas** — éxito, estancamiento (2 pasadas sin
   ganancia), o decisión que requiere al humano.
6. **Reporte con evidencia y huecos** — qué se logró, qué se revirtió, qué NO se probó.

Regla anti-trampa: **nunca silencies un check ni debilites el objetivo** para
"pasar" el loop. Si el objetivo parece imposible, se reporta al humano, no se edita.

Doble criterio de conservación: la métrica objetivo debe mejorar Y la métrica de
guarda no debe degradarse más de la tolerancia fijada de antemano. Cerrar sin
maquillar: si el objetivo no se alcanza, el reporte final lo dice tal cual.

## Loops implementados
| Comando | Qué optimiza | Guarda | Evidencia que usa |
|---|---|---|---|
| `/loop-pago-devnet` | Latencia p50 y tasa de éxito del pago gasless E2E | Costo SOL/tx del relayer (+20% máx.) | `backend/scripts/bench-pago.ts` |

## Loops planificados (crear cuando su fase arranque)
- `/loop-x402-devnet` (Fase 2): latencia del ciclo 402 → pago → 200 y tasa de
  verificación del facilitador. Guarda: cero entregas de recurso sin pago verificado.
- `/loop-costo-relayer` (Fase 3): lamports gastados por pago y eficiencia del
  ciclo de tesorería USDC→SOL. Guarda: tasa de éxito de pagos.

## Requisito común: assets de prueba
Todo listo desde el 2026-08-19 (`pnpm run setup:devnet` los regenera):
- [x] Comercio de prueba inicializado en devnet.
- [x] Wallet relayer fondeada con SOL.
- [x] Wallet "usuario" con saldo del token de prueba (y 0 SOL, a propósito).
- [x] `backend/scripts/bench-pago.ts` validado contra devnet.

## Historial
<!-- Cada iteración de cualquier loop se anota aquí: fecha, loop, cambio, números, decisión -->

### 2026-08-19 — `/loop-pago-devnet`: línea base medida

Primera medición real contra devnet, sin optimizar nada todavía.

| Métrica | Valor | Objetivo |
|---|---|---|
| Tasa de éxito | 5/5 | ≥ 4/5 |
| Latencia p50 | **1748 ms** | < 3000 ms |
| Latencias por corrida | 1748, 1701, 1710, 1755, 6497 ms | — |
| Costo del relayer | **10 000 lamports/tx** (~0,00001 SOL) | guarda: +20% máx. |

**El objetivo ya se cumple sin optimizar**, así que el loop no se abre por
ahora: optimizar algo que sobra el margen sería gasto sin retorno.

Dos observaciones para cuando haga falta:
- La quinta corrida (6497 ms) fue por respuestas 429 del RPC público con
  reintentos. La primera palanca no es el código sino el endpoint RPC.
- El costo por transacción es exactamente el fee de dos firmas, sin fee de
  prioridad. Si se agrega prioridad para ganar latencia, hay que vigilar la
  guarda de costo.
