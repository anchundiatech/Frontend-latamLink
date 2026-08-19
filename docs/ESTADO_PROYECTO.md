# Estado del proyecto — LatamLink Pay

Última actualización: 2026-08-18.

## Resumen ejecutivo

Rail de pagos on-chain en Solana (USDC) para comercios de LATAM: cada cobro se
reparte automáticamente entre hasta 10 destinos, el usuario paga **sin necesitar
SOL** (relayer gasless) y la plataforma se monetiza como API vía el protocolo
x402.

| Componente | Estado |
|---|---|
| Smart contract `latamlink_pay` | ✅ Desplegado en devnet y auditado |
| Backend — relayer gasless (Fase 1) | ✅ Implementado y testeado; falta corrida E2E en devnet |
| Backend — alta de comercios | ✅ Implementado (`POST /merchants`, owner = plataforma) |
| Backend — tesorería de comisiones | ✅ Implementado (`pnpm run tesoreria:gas`) |
| Backend — capa x402 (Fase 2) | ✅ Implementada; falta elegir y configurar facilitador |
| Liquidación híbrida (Fase 3) | 🟡 Comprobantes ya se registran; falta el job de reparto |
| Frontend | Repo aparte (`Frontend-latamLink`) |

Program ID: `GSeGuv2K3meepgSHCehP5jGkRnjRZk96a9vsPSSJ7TjC` (devnet).

## Modelo de negocio (decidido 2026-08-18)

Los comercios se dan de alta **siempre** a través del backend, con `owner`
on-chain = **wallet de la plataforma**. Es la única configuración en la que las
comisiones son nuestras, porque el contrato solo permite retirar el `gas_vault`
al owner y hacia una cuenta del owner:

- `pos_fee_bps` → llega a la cuenta de la plataforma en **cada pago**.
- `fee_bps` + dust → se acumulan en el `gas_vault` y se barren con
  `pnpm run tesoreria:gas`.
- El resto se reparte automáticamente entre los destinos del comercio.

Ese USDC recaudado financia el SOL que gasta el relayer (conversión off-chain,
operación de tesorería periódica).

## Bloqueo activo

**Fondeo de devnet.** El faucet RPC tiene limitada esta IP (429). Para cerrar la
verificación end-to-end hay que fondear a mano en https://faucet.solana.com
(~1 SOL cada una):

- Relayer (fee payer): `DDM73ECt8ASCkgSvpAjtTwa9vix5x15dGz5mP9mfiKKz`
- Plataforma (owner): `68tvdDT395Ai1hRquw2JoPZigQHHrRQSYtyxPqw5R5Qg`

Con saldo disponible:
`pnpm run setup:devnet && pnpm run e2e && pnpm run bench`

## Decisiones tomadas

1. **Alcance**: spec + PoC en devnet + backend completo (relayer + x402).
2. **Liquidación x402**: modelo **híbrido** — se cobra con el esquema estándar
   "exact" (compatible con facilitadores públicos) en una tesorería intermedia y
   después el backend invoca `pay()` para conservar el split.
3. **Owner de los comercios**: la plataforma (ver modelo de negocio).
4. **Contrato inmutable**: el programa desplegado no se modifica; relayer y x402
   se construyen encima.
5. **Gestor de paquetes**: pnpm siempre.

## Decisiones abiertas

1. **Facilitador x402** para devnet: Coinbase CDP vs alternativas. Es lo único
   que falta para activar la capa x402 ya implementada.
2. **Almacenamiento**: hoy los pagos y comprobantes se persisten en archivos
   JSON (MVP). Para producción: postgres o el Supabase que ya usa el frontend.
3. **Custodia de keypairs en producción** (KMS/HSM) — Fase 3.
4. **Observaciones de la auditoría del contrato** (`update_config` no revalida
   destinos ≠ vault): aceptar o corregir en un eventual redespliegue.
5. **Alineación con el frontend**: su rama `develop` crea comercios con
   owner = comercio y cobra con Solana Pay directo (sin pasar por `pay()`), lo
   que anula el split y las comisiones. Debe migrar a los endpoints de este
   backend — detalle en `docs/MAPA_BACKEND.md`.

## Próximos pasos

1. Fondear devnet y correr `setup:devnet` → `e2e` → `bench` (cierra la demo
   funcional end-to-end).
2. Elegir facilitador x402 y probar un cobro real contra `POST /x402/qr`.
3. Job de liquidación híbrida: repartir los comprobantes x402 vía `pay()`.
4. Listener de `PaymentProcessed` + webhook al POS.
5. Endurecer para producción: almacenamiento real, KMS, monitoreo del saldo del
   relayer y auditoría externa antes de mainnet.

## Documentación

- `docs/MAPA_BACKEND.md` — mapa de archivos del backend y modelo del gas_vault.
- `docs/ESTUDIO_TRABAJO.md` — estudio de avance y plan por hitos.
- `docs/INTEGRACION_FRONTEND.md` — contrato de la API para la app.
- `docs/SPEC_X402.md` — spec de la capa x402.
- `docs/AUDITORIA_CONTRATO.md` — hallazgos y fixes del contrato.
- `docs/LOOPS.md` — metodología de optimización por métricas.
