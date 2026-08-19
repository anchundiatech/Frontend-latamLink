# Mapa del backend — LatamLink Pay

> Mapa de trabajo del proyecto centrado en `backend/`: qué hace cada archivo,
> qué estado tiene y qué trabajo pendiente vive en cada uno. Incluye el modelo
> de negocio del `gas_vault` (comisiones → wallet de la plataforma).
> Actualizado: 2026-08-18.

---

## El modelo de negocio del gas_vault (resuelto)

**El planteo**: las comisiones que el contrato cobra en cada pago se acumulan en
el `gas_vault` de cada merchant y "no iban a ningún lado" — tienen que terminar
en una wallet nuestra, y solo nosotros debemos poder manejarlas.

**Lo que dicta el contrato desplegado** (`lib.rs:250` y `:343` del repo del contrato):
`withdraw_gas_fees` solo puede firmarlo el **`owner` del merchant**, y el
destino debe ser una token account **propiedad de ese owner** y del mismo mint.
No hay forma de desviar esos fondos a terceros.

**El modelo que se deriva (y ya está implementado en el onboarding)**:

```
Merchant creado por NUESTRO backend con owner = wallet de la PLATAFORMA
   │
   ├── pos_fee (pos_fee_bps, sobre el bruto)  → ATA de la plataforma  [cada pago, automático]
   ├── gas_fee (fee_bps) + dust               → gas_vault del merchant [cada pago, automático]
   │       └── pnpm run tesoreria:gas         → ATA de la plataforma  [barrido periódico]
   └── resto (≈98.5%)                          → destinos del comercio [cada pago, automático]
```

- El **comercio** cobra su parte de forma automática y trustless (el split).
- La **plataforma** (nosotros) es la única que puede tocar las comisiones:
  la `pos_fee` llega directo en cada pago y el `gas_vault` se barre con
  `pnpm run tesoreria:gas` (solo firma nuestra keypair `owner`).
- Ese USDC recaudado financia el SOL del relayer (swap USDC→SOL off-chain,
  operación de tesorería del informe Parte 2.3.F).

**Regla de onboarding derivada** (clave): todo merchant se crea vía nuestro
backend con `owner` = plataforma. Si un merchant se creara con su propio owner,
sus comisiones quedarían fuera de nuestro alcance — el contrato no distingue
"plataforma" de "dueño". Hacer ese rol explícito en el programa (tesorería
global) queda como candidato al redeploy de Fase 3, junto con las
observaciones 1.7 de la auditoría.

---

## Mapa de archivos

### `backend/src/` — el servicio

| Archivo | Qué hace | Estado | Trabajo pendiente anclado aquí |
|---|---|---|---|
| `config.ts` | Env (RPC, keys, límites, CORS, x402), conexión RPC, carga de keypairs (relayer y plataforma) | ✅ | En Fase 3, keypairs vía KMS |
| `server.ts` | Express: `/health`, `/config`, `/merchants`, `/payments/build`, `/payments/submit`, `/payments`, monta `/x402` | ✅ | Listener de `PaymentProcessed` + webhook al POS |
| `http/cors.ts` | CORS por lista blanca de orígenes (`ALLOWED_ORIGINS`) | ✅ | — |
| `http/rateLimit.ts` | Ventana fija por IP → 429 con `Retry-After` | ✅ | A redis cuando haya varias instancias |
| `relayer/service.ts` | Arma la tx `pay` (fee_payer=relayer, pre-validación off-chain, ComputeBudget); firma, envía y confirma | ✅ | Reintento ante blockhash expirado · métricas de latencia |
| `relayer/validate.ts` | Anti-abuso antes de firmar: whitelist de programas, una sola `pay`, relayer aislado, firma del usuario, anti-replay, límite diario, re-check on-chain | ✅ | Anti-replay y límite diario a redis (Fase 3) |
| `merchants/service.ts` | Alta de comercio con owner = plataforma; valida porcentajes, destinos, mints y fees antes de tocar la red | ✅ | `update_config` / `toggle_active` cuando haya panel |
| `storage/payments.ts` | Registro de pagos (firma ↔ referencia del QR) para conciliación | ✅ | Migrar a postgres/Supabase |
| `storage/x402Receipts.ts` | Comprobantes de cobros x402 liquidados; entrada del job de Fase 3 | ✅ | — |
| `x402/types.ts` | Tipos del protocolo (`PaymentRequirements`, verify/settle, error de facilitador caído) | ✅ | — |
| `x402/facilitator.ts` | Cliente HTTP del facilitador con timeout y detección de caída | ✅ | Elegir facilitador y configurarlo |
| `x402/middleware.ts` | Paywall 402 → verify → settle → recurso. Sin pago confirmado no hay recurso | ✅ | — |
| `x402/routes.ts` | Recursos cobrables: `POST /x402/qr` y `GET /x402/merchants/:address/stats` | ✅ | Más recursos según demanda |
| `solana/constants.ts` | Program ID, discriminadores Anchor (`pay`, `initialize_merchant`, `withdraw_gas_fees`), límite de CU | ✅ | — |
| `solana/merchant.ts` | PDAs (merchant/vault/gas_vault), decoder Borsh manual de la cuenta Merchant | ✅ | Caché del merchant (candidato del loop de latencia) |
| `solana/instructions.ts` | Builders: `pay` (16 cuentas en orden exacto), `initialize_merchant`, `withdraw_gas_fees` (tesorería) | ✅ | Builder de `update_config` y `toggle_merchant_active` cuando haya panel de administración |

### `backend/tests/` — red de seguridad

| Archivo | Cubre | Casos |
|---|---|---|
| `validate.test.ts` | Anti-abuso del relayer: fee payer ajeno, instrucción extra, doble `pay`, discriminador ajeno, datos malformados, relayer infiltrado, firma faltante, replay, merchant falso, inactivo, monto bajo mínimo | 12 |
| `x402.test.ts` | La invariante "sin pago verificado no hay recurso" en todas sus ramas | 6 |
| `dailyCap.test.ts` | Corte por límite diario de gasto del relayer | 1 |
| `rateLimit.test.ts` | 429 con `Retry-After`, aislamiento por IP, reapertura de ventana | 3 |

### `backend/scripts/` — operación y evidencia

| Script | Comando | Qué hace | Estado |
|---|---|---|---|
| `setup-devnet.ts` | `pnpm run setup:devnet` | Bootstrap idempotente: keypairs, SOL, mint de prueba, ATAs, merchant demo (owner = plataforma) | ⛔ Bloqueado por fondeo devnet |
| `e2e-pago.ts` | `pnpm run e2e` | Pago gasless completo por HTTP con verificación matemática del split y usuario con 0 SOL | ⛔ Depende del setup |
| `bench-pago.ts` | `pnpm run bench` | 5 pagos, p50 de latencia y lamports/tx — línea base del loop de latencia | ⛔ Depende del setup |
| `tesoreria-gas.ts` | `pnpm run tesoreria:gas` | Barre el gas_vault completo → cuenta de la plataforma (solo firma el owner) | ✅ Escrito; se ejercita tras el E2E |

### Lo que NO existe todavía en `backend/` (radar completo)

**Para activar x402** (única pieza que falta de la Fase 2)
1. Elegir facilitador con soporte `solana-devnet` y completar `X402_FACILITATOR_URL`, `X402_TREASURY`, `X402_ASSET`. Sin eso la capa no se monta (503 deliberado).

**Fase 3 (producción)**
2. Job de liquidación híbrida: leer `listPendingReceipts()` y repartir vía `pay()` contra un comercio interno de la plataforma.
3. Listener de `PaymentProcessed` (logs/websocket) → webhook al POS con el split detallado.
4. Cron de tesorería: `tesoreria:gas` periódico + monitoreo del saldo SOL del relayer + alertas + refill (swap USDC→SOL).
5. redis para anti-replay/límite diario/rate limiting · postgres para pagos · KMS para keypairs · rotación de relayers.
6. Reintento automático ante blockhash expirado entre build y submit.

### Backend descubierto en `Frontend-latamLink` (rama `develop`)

El repo del frontend (GitHub `XxHugheadxX/Frontend-latamLink`, única rama:
`develop`) contiene un backend embebido en Next.js que se solapa con este:

| Pieza (en `src/lib/`) | Qué hace | Veredicto |
|---|---|---|
| `actions/sponsorMerchantSetup.ts` | Server action: transfiere 0.01 SOL de una tesorería (env `TREASURY_SECRET_KEY`) a la wallet del comercio para que ÉL firme su `initialize_merchant` | ⚠️ **Conflicto de modelo** (ver abajo) |
| `actions/treasuryStatus.ts` | Estado de esa tesorería | Reutilizable |
| `anchor/client.ts` + `idl.ts` | Cliente Anchor: deriva merchant PDA con **owner = wallet del comercio**; scan de merchants para el admin | ⚠️ Conflicto de modelo |
| `services/solanaPay.ts` + `useSolanaPay.ts` | QR Solana Pay de **transferencia directa** (`solana:` URL) con reference + watcher de confirmación | ⚠️ **Bypassa el contrato** |
| `services/usePrivyWallet.ts`, `wallet/PrivyProvider.tsx` | Integración Privy | ✅ Alineado |
| `supabase/client.ts`, `store/*` | Persistencia UI (waitlist, sesión, txs) | ✅ Complementario |
| `services/priceFeed.ts`, `retry.ts` | Utilidades con tests | ✅ Reutilizable |

**Los 3 conflictos de arquitectura que hay que resolver (decisión de negocio):**

1. **¿Quién es el `owner` del merchant?** El front hace owner = wallet Privy
   del comercio → **las comisiones del gas_vault y la pos_fee quedarían en manos
   del comercio, no nuestras** — exactamente lo contrario del modelo definido
   arriba. Para que los fondos sean solo nuestros, el onboarding debe crear el
   merchant vía nuestro backend con owner = plataforma (y el "sponsor" de
   0.01 SOL deja de ser necesario: el comercio nunca firma nada on-chain).
2. **El POS cobra con Solana Pay directo** (transferencia simple al recipient)
   → el pago NO pasa por `pay()`: sin split, sin comisiones, **sin ingresos**.
   El QR debe llevar al pagador por build → firma Privy → submit del relayer.
   Solana Pay puede quedarse como transporte usando su modo *transaction
   request* (el QR apunta a nuestra API y esta devuelve la tx `pay` armada) —
   encaja 1:1 con `POST /payments/build`.
3. **Mint distinto**: el front usa el USDC-dev de Circle (`4zMM...ncDU`);
   este backend usa mint propio minteable. Alinear consumiendo `GET /config`.

**Recomendación**: este backend Express queda como única fuente de verdad de
pagos y onboarding (ya tiene el anti-abuso y el modelo de tesorería); el front
conserva Supabase/stores para datos de UI y consume nuestros endpoints. La
alternativa (migrar este relayer a server actions de Next) concentra todo en un
repo pero pierde el aislamiento del servicio que firma con fondos.

### Fuera de `backend/` (contexto del mapa)

- Programa desplegado: repo `LATAMLINKPAY` (inmutable; candidatos a redeploy de Fase 3: tesorería global explícita, obs. 1.7).
- `docs/` — `ESTUDIO_TRABAJO.md` (plan por hitos A–D), `INTEGRACION_FRONTEND.md`, `SPEC_X402.md`, `AUDITORIA_CONTRATO.md`, `ESTADO_PROYECTO.md`, `LOOPS.md`.
- Frontend — otro repo; consume `build`/`submit`/`config` según el informe de integración.

---

## Cola de trabajo inmediata (según este mapa)

| Orden | Ítem | Estado |
|---|---|---|
| 1 | Tests del validador anti-abuso | ✅ 12 casos |
| 2 | CORS + `GET /config` | ✅ |
| 3 | Endpoint `POST /merchants` (owner = plataforma; reemplaza el sponsor del front) | ✅ |
| 4 | Rate limiting por IP | ✅ |
| 5 | Persistencia + `reference` del QR | ✅ (archivos JSON; migrable) |
| 6 | Capa x402 completa con tests | ✅ Falta configurar facilitador |
| 7 | Barrido de tesorería del gas_vault | ✅ Escrito |
| 8 | E2E + bench + primer barrido real | ⛔ Fondeo devnet (faucet.solana.com) |
| 9 | **Alinear el frontend** con este backend (owner, POS vía relayer, mint) | Pendiente del equipo de frontend |
