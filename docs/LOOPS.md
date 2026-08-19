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
| `/loop-pago-devnet` | Latencia p50 y tasa de éxito del pago gasless E2E | Costo SOL/tx del relayer (+20% máx.) | `backend/scripts/bench-pago.ts` (no existe aún) |

## Loops planificados (crear cuando su fase arranque)
- `/loop-x402-devnet` (Fase 2): latencia del ciclo 402 → pago → 200 y tasa de
  verificación del facilitador. Guarda: cero entregas de recurso sin pago verificado.
- `/loop-costo-relayer` (Fase 3): lamports gastados por pago y eficiencia del
  ciclo de tesorería USDC→SOL. Guarda: tasa de éxito de pagos.

## Requisito común: assets de prueba
Material que solo el humano puede proveer (sin esto los loops se detienen en la
preparación — a propósito):
- Merchant de prueba inicializado en devnet (owner keypair de prueba, merchant_id).
- Wallet relayer de devnet fondeada con SOL de faucet.
- Wallet "usuario" de devnet con USDC-dev (mint de devnet) para pagar.
- `backend/scripts/bench-pago.ts` validado una vez a mano.

## Historial
<!-- Cada iteración de cualquier loop se anota aquí: fecha, loop, cambio, números, decisión -->
