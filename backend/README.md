# Backend LatamLink Pay — Relayer gasless + x402

Backend TypeScript sobre el programa `latamlink_pay` (Solana, Anchor). El
usuario paga solo en USDC y **nunca necesita SOL**: el backend actúa como
`fee_payer` (relayer). Encima corre la capa x402, que monetiza la plataforma
como API cobrando por request en USDC.

## Flujo gasless

1. `POST /payments/build` — recibe `{merchantAddress, payerPubkey, amount}`,
   lee el comercio on-chain, resuelve todas las cuentas (ATAs, PDAs, 10 destinos
   en el orden exacto) y devuelve la transacción serializada con
   `fee_payer = relayer`, sin firmas.
2. La app hace que el usuario firme SOLO su parte (Privy `signTransaction`).
3. `POST /payments/submit` — valida la transacción, firma como fee payer y la
   envía. Validaciones anti-abuso: whitelist de programas (solo `latamlink_pay`
   + ComputeBudget), una sola instrucción `pay`, el relayer no aparece en
   ninguna instrucción, comercio activo y monto ≥ mínimo, firma del usuario
   presente, anti-replay, límite de gasto diario y rate limiting por IP.

## Endpoints

| Método | Ruta | Para qué | Acceso |
|---|---|---|---|
| GET | `/health` | Disponibilidad y pubkey del relayer | público |
| GET | `/config` | Config pública para el frontend (mint, comercio demo, decimales) | público |
| POST | `/merchants` | Alta de comercio (owner on-chain = plataforma) | operador |
| POST | `/payments/build` | Paso 1 del pago gasless | público |
| POST | `/payments/submit` | Paso 2: valida, firma y envía | público |
| GET | `/payments` | Conciliación: pagos registrados (filtros `merchant`, `reference`) | operador |
| POST | `/x402/qr` | Genera un QR de cobro | pago x402 |
| GET | `/x402/merchants/:address/stats` | Estadísticas del comercio | pago x402 |

Los endpoints de **operador** requieren la cabecera `X-Api-Key` con el valor de
`ADMIN_API_KEY`; sin esa variable configurada responden 503 (nunca quedan
abiertos). `POST /payments/submit` devuelve **202** si la transacción se envió
pero no confirmó a tiempo: hay que consultar esa firma, no volver a cobrar.

Las rutas `/x402/*` responden `402 Payment Required` con los requisitos de pago
y solo entregan el recurso cuando el facilitador confirma el pago. Si falta
configuración de x402, la capa no se monta (responde 503 en vez de exponer un
paywall que no puede verificar).

## Modelo de comisiones

Los comercios se crean con `owner` = wallet de la plataforma, porque el contrato
solo permite retirar el `gas_vault` al owner. Así, la comisión POS llega a la
plataforma en cada pago y la comisión de gas se acumula para barrerse con
`pnpm run tesoreria:gas`. Ver `docs/MAPA_BACKEND.md`.

## Comandos

```bash
pnpm install
cp .env.example .env
pnpm run setup:devnet     # keypairs + SOL + mint de prueba + comercio demo (idempotente)
pnpm run e2e              # pago gasless completo por HTTP con verificación del split
pnpm run bench            # línea base de latencia y lamports/tx
pnpm run tesoreria:gas    # barre el gas_vault hacia la wallet de la plataforma
pnpm run dev              # levanta el backend en :3000
pnpm run test             # tests del anti-abuso, x402 y rate limiting
pnpm run typecheck
```

Gestor de paquetes: **pnpm siempre** (vía corepack), nunca npm.

## Notas

- En devnet se usa un mint SPL propio de 6 decimales (minteable a voluntad) en
  lugar del USDC-dev de Circle, para no depender de faucets externos. El
  contrato es agnóstico al mint.
- Keypairs en `.keys/` y registros en `data/` (ambos ignorados por git). NUNCA
  commitear keypairs.
- Anti-replay, límite diario, rate limiting y persistencia viven en memoria o en
  archivos JSON (MVP). En producción van a redis/postgres.
