# Cómo encajan los dos backends

Este repo pasa a tener dos servicios de backend. No se solapan: cubren mitades
distintas del mismo producto y se necesitan mutuamente. Este documento propone
el reparto de responsabilidades para que no se dupliquen ni se pisen.

## Qué hace cada uno

| | `src/` (API de catálogo) | `backend/` (relayer + x402) |
|---|---|---|
| Autor original | Backend con Express + Prisma | Este aporte |
| Responsabilidad | Datos del negocio: comercios, terminales, destinos, historial | Todo lo que toca la cadena: armar, validar, firmar y enviar transacciones |
| Estado | PostgreSQL vía Prisma | Sin base propia (archivos JSONL de MVP) |
| Maneja fondos | No | **Sí**: custodia el keypair del relayer y el de la plataforma |
| Puerto | 3000 | 3000 (configurable con `PORT`) |

**Por qué conviene que sigan separados:** el servicio del relayer firma
transacciones con fondos reales y paga el fee de red de cada pago. Aislarlo
limita el alcance de cualquier problema en el resto de la API y permite darle
tratamiento propio (custodia de claves, límites de gasto, despliegue y rotación
independientes). El CRUD, en cambio, no necesita ninguna clave.

## El punto de convergencia: el esquema de Prisma ya modela lo que producimos

`prisma/schema.prisma` tiene exactamente las entidades que el relayer genera:

- `Payment` (txSignature, posFee, gasFee, dust, status `PENDING`/`CONFIRMED`) es
  lo mismo que hoy escribe el relayer en `backend/data/payments.jsonl`.
- `Merchant` (merchantIdOnchain, pdaAddress, pdaPaymentVault, pdaGasVault) es
  exactamente lo que devuelve el alta on-chain del relayer.

Por eso la migración natural es que **el relayer persista contra Prisma** en
lugar de archivos. El almacenamiento del relayer está detrás de dos módulos
pequeños (`backend/src/storage/`) precisamente para poder cambiarlo sin tocar el
resto.

## Reparto propuesto

1. **Alta de comercio**: la API de catálogo recibe la solicitud y llama a
   `POST /merchants` del relayer, que crea las cuentas on-chain y devuelve las
   PDAs; la API las guarda en `Merchant`. Hoy el relayer no escribe en la base.
2. **Cobro**: el POS pide la transacción a `POST /payments/build`, el usuario
   firma con Privy y se envía por `POST /payments/submit`. El relayer registra
   el pago (hoy en archivo, mañana en `Payment`).
3. **Consulta e historial**: siempre contra la API de catálogo (Prisma), que es
   la que tiene índices, relaciones y filtros.
4. **Monetización por API** (x402): la expone el relayer, porque el cobro por
   request está atado a la verificación de un pago on-chain.

## Dos cosas del frontend que hay que cambiar

Son decisiones de negocio, no de implementación, y afectan directamente a los
ingresos:

1. **El owner de cada comercio debe ser la plataforma.** Hoy
   `src/lib/actions/sponsorMerchantSetup.ts` financia al comercio para que él
   mismo cree su merchant, quedando como `owner` on-chain. El contrato solo
   permite retirar el `gas_vault` al owner y hacia una cuenta suya: con ese
   esquema **las comisiones quedan en manos de cada comercio, no de la
   plataforma**. Si el alta pasa por `POST /merchants`, el owner es la
   plataforma, las comisiones son nuestras y además el comercio deja de
   necesitar SOL (desaparece la necesidad de patrocinarlo).
2. **El POS debe cobrar a través del contrato.** Hoy
   `src/lib/services/solanaPay.ts` arma una URL de Solana Pay de transferencia
   directa: el pago va del pagador al destinatario **sin pasar por `pay()`**, o
   sea sin split y sin comisiones. Solana Pay sigue sirviendo como transporte,
   pero en modo *transaction request*, apuntando a `POST /payments/build` — que
   es justo lo que devuelve `POST /x402/qr`.

También conviene unificar el mint: el frontend usa el USDC-dev de Circle y el
relayer un mint propio de pruebas. `GET /config` del relayer expone el que está
en uso para no hardcodearlo en la app.

## Puesta en marcha

```bash
cd backend
pnpm install
cp .env.example .env     # completar ADMIN_API_KEY y, si se usa, x402
pnpm run test            # 30 tests
pnpm run dev             # usar otro PORT si la API de catálogo ocupa el 3000
```

Detalle de endpoints y flujo de firma en `docs/INTEGRACION_FRONTEND.md`;
arquitectura y modelo de comisiones en `docs/MAPA_BACKEND.md`; hallazgos de
seguridad en `docs/AUDITORIA_BACKEND.md`.
