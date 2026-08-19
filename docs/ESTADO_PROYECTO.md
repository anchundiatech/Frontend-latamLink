# Estado del proyecto — LatamLink Pay

Última actualización: 2026-08-19.

## Resumen ejecutivo

Rail de pagos on-chain en Solana (USDC) para comercios de LATAM: cada cobro se
reparte automáticamente entre hasta 10 destinos, el usuario paga **sin necesitar
SOL** (relayer gasless) y la plataforma se monetiza como API vía el protocolo
x402.

| Componente | Estado |
|---|---|
| Smart contract `latamlink_pay` | ✅ Desplegado en devnet y auditado |
| Backend — relayer gasless (Fase 1) | ✅ **Verificado end-to-end en devnet** |
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

## Verificación end-to-end (2026-08-19)

El camino crítico está probado contra devnet, no solo escrito:

- Comercio de prueba creado on-chain con la plataforma como owner.
- Pago gasless de 10 USDC-test repartido correctamente: el usuario firmó con
  **0 SOL** en su wallet y el relayer pagó el fee de red.
- Las seis comprobaciones de reparto (comisión POS, split 60/40, comisión de
  gas, bóveda en cero) coincidieron **exactamente** con la matemática del
  contrato.
- Firma:
  `mrfBZomjjL2ZbDHFLhQLmHjW5B7ivmwGUntvAAjqs9fku7NgKtkiwGS9TuPrbhQBjqEBBHVZeRsziohe6kvBKcB`

Rendimiento medido (5 corridas): **5/5 éxitos, p50 1748 ms, 10 000 lamports por
transacción**. El objetivo de latencia (<3 s) se cumple sin optimizar. Detalle
en `docs/LOOPS.md`.

Para regenerar el entorno: `pnpm run setup:devnet && pnpm run e2e && pnpm run bench`.

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

1. Elegir facilitador x402 y probar un cobro real contra `POST /x402/qr`.
2. Job de liquidación híbrida: repartir los comprobantes x402 vía `pay()`.
3. Listener de `PaymentProcessed` + webhook al POS.
4. Endurecer para producción: almacenamiento real, KMS, monitoreo del saldo del
   relayer y auditoría externa antes de mainnet.

## Documentación

- `docs/MAPA_BACKEND.md` — mapa de archivos del backend y modelo del gas_vault.
- `docs/ESTUDIO_TRABAJO.md` — estudio de avance y plan por hitos.
- `docs/INTEGRACION_FRONTEND.md` — contrato de la API para la app.
- `docs/SPEC_X402.md` — spec de la capa x402.
- `docs/AUDITORIA_CONTRATO.md` — hallazgos y fixes del contrato.
- `docs/LOOPS.md` — metodología de optimización por métricas.
