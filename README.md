# LatamLink Pay

Plataforma de pagos para comercios sobre **Solana**: alta de comercio sin
frase semilla (Privy), cobro por QR (Solana Pay) en USDC, y retiro con
comisión de la plataforma descontada en ese momento. Ver [`AGENTS.md`](AGENTS.md)
para las reglas de arquitectura, invariantes financieras y seguridad — es
lectura obligatoria antes de tocar código de pagos.

## Estructura del repositorio

Monorepo con tres superficies independientes:

```
latamlink-pay/
├── Frontend/     Next.js 16 + React 19 + TypeScript — dashboard, POS, onboarding
├── backend/      Dos servicios Express (relayer gasless + API de catálogo/Prisma)
├── docs/         Notas técnicas internas (auditorías, mapas, informes de avance)
├── render.yaml   Blueprint de despliegue del backend en Render
└── AGENTS.md     Reglas de arquitectura, invariantes financieras y seguridad
```

`Frontend/` es miembro del workspace de pnpm de la raíz (`pnpm-workspace.yaml`).
`backend/` es deliberadamente independiente: tiene su propio `pnpm-lock.yaml`
y no se instala desde la raíz — ver [`backend/README.md`](backend/README.md).

### Los tres servicios en producción

| Servicio | Dónde corre | Qué hace |
|---|---|---|
| **Frontend** | Vercel | Next.js App Router. Sirve la UI y actúa de proxy servidor→servidor hacia los dos backends (el navegador nunca les habla directo). |
| **`latamlink-relayer`** | Render | `backend/src/server.ts`. Paga el gas por el comercio, arma y valida transacciones, firma altas de comercio y retiros. |
| **`latamlink-catalog-api`** | Render | `backend/src/catalogServer.ts`. CRUD de comercios/destinos/terminales/pagos sobre Postgres vía Prisma. |

Ambos servicios de Render comparten una sola base Postgres (`latamlink-db` en
`render.yaml`) pero escriben en tablas distintas.

## Cadena de dependencia (nunca saltarla)

```
UI → Hook de dominio / Controller → Service → Backend → Validación (Zod)
   → Relayer/RPC → Smart Contract → Persistencia (Postgres)
```

El frontend nunca llama directo al relayer con credenciales de operador —
siempre pasa por una route handler de Next.js (`Frontend/src/app/api/**`) que
guarda esa credencial del lado servidor. Igual el catálogo: solo se habla
desde rutas de servidor, nunca desde un componente cliente.

## Cómo funciona un cobro hoy

El QR que genera el POS es un **Solana Pay "transfer request"**
(`solana:<wallet>?amount=...`, armado con el SDK `@solana/pay`): la wallet del
cliente paga directo a la wallet del comercio, sin pasar por el contrato. Se
eligió así porque las wallets móviles (Phantom, Solflare) no reconocen de
forma confiable el patrón "transaction request" al escanear con la cámara.
Consecuencia: hoy no hay reparto automático entre varios destinos (eso quedó
"próximamente" en la UI) y el cliente paga su propia red. La **comisión de la
plataforma** no se pierde: se cobra en el momento del **retiro**
(`backend/src/payouts/service.ts`), con una segunda transferencia SPL en la
misma transacción de payout hacia la ATA de la plataforma.

El contrato Anchor (`latamlink_pay`, ver `AGENTS.md` para el orden de cálculo
del split) sigue existiendo y se usa para el alta de comercio
(`initialize_merchant`) y la config on-chain — el camino `pay()` con reparto
multi-destino queda disponible para cuando haya una página de checkout con
wallet-adapter que sí soporte el patrón "transaction request".

## Levantar todo en local

```bash
# 1. Backend (dos procesos, ver backend/README.md para detalle completo)
cd backend
pnpm install
cp .env.example .env            # completar con tu Postgres local, etc.
pnpm exec prisma generate
pnpm run setup:devnet           # keypairs + SOL + mint de prueba + comercio demo
pnpm run dev                    # relayer en :3001 (o el puerto que pongas en .env)
# en otra terminal:
pnpm exec tsx src/catalogServer.ts   # API de catálogo en :3002

# 2. Frontend
cd ../Frontend
pnpm install --frozen-lockfile
cp .env.example .env            # completar RELAYER_URL/CATALOG_API_URL, Privy, etc.
pnpm run dev                    # http://localhost:3000
```

Antes de dar por terminada una tarea corré `lint` + `typecheck`/`build` +
`test` en cada superficie que tocaste — ver checklist completo en
[`AGENTS.md`](AGENTS.md#-9-checklist-antes-de-abrir-un-pr).

## Repositorios relacionados

El programa Anchor (`latamlink_pay`, Program ID `GSeGuv2K3meepgSHCehP5jGkRnjRZk96a9vsPSSJ7TjC`
en devnet) vive en un repositorio aparte, no en este monorepo:

- **Smart Contract:** [github.com/XxHugheadxX/LATAMLINKPAY](https://github.com/XxHugheadxX/LATAMLINKPAY)

## Documentación por superficie

- [`Frontend/README.md`](Frontend/README.md) — estructura de la app, hooks de
  dominio, stores, flujos de pago/onboarding, variables de entorno.
- [`backend/README.md`](backend/README.md) — flujo gasless, endpoints,
  modelo de comisiones, comandos.
- [`AGENTS.md`](AGENTS.md) — reglas de arquitectura, invariantes financieras,
  líneas rojas de seguridad y lineamientos de UI/UX. Se aplican a cualquier
  cambio en el repo, humano o agente de IA.
