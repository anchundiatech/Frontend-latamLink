<div align="center">
<div align="center">
<img src="Frontend/public/Logo.webp" alt="LatamLink Pay" width="120" height="120" />
</div>

<img src="https://img.shields.io/badge/LATAMLINK-PAY-00D2BD?style=for-the-badge&labelColor=8B34FA" alt="LatamLink Pay"/>

# LatamLink Pay

**Tu dinero, a la velocidad de Solana**

**Frontend**

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-000000?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-433E38?style=flat-square)
![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=flat-square)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat-square&logo=framer&logoColor=white)


**Blockchain**

![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?style=flat-square&logo=solana&logoColor=white)
![Anchor](https://img.shields.io/badge/Anchor-Rust-121D33?style=flat-square&logo=rust&logoColor=white)
![Privy](https://img.shields.io/badge/Privy-Embedded_Wallets-1E1B4B?style=flat-square)

**Backend**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)

**Infraestructura y herramientas**

![pnpm](https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat-square&logo=eslint&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square)

</div>

---

Es un terminal de pagos adaptativo que permite a cualquier dispositivo convertirse en un punto de aceptación de activos digitales, utilizando USD como unidad de cuenta y stablecoins/cripto como medio de liquidación

## Estructura del repositorio

Monorepo con tres superficies independientes:

```
latamlink-pay/
├── Frontend/     Next.js 16 + React 19 + TypeScript — dashboard, POS, onboarding
├── backend/      Dos servicios Express (relayer gasless + API de catálogo/Prisma)
├── docs/         Notas técnicas internas (auditorías, mapas, informes de avance)
└── render.yaml   Blueprint de despliegue del backend en Render
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

El contrato Anchor (`latamlink_pay`) sigue existiendo y se usa para el alta de comercio
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

Antes de dar por terminada una tarea, ejecuta `lint` + `typecheck`/`build` +
`test` en cada superficie que hayas modificado.

## Repositorios relacionados

El programa Anchor (`latamlink_pay`, Program ID `GSeGuv2K3meepgSHCehP5jGkRnjRZk96a9vsPSSJ7TjC`
en devnet) vive en un repositorio aparte, no en este monorepo:

- **Smart Contract:** [github.com/XxHugheadxX/LATAMLINKPAY](https://github.com/XxHugheadxX/LATAMLINKPAY)

## Documentación por superficie

- [`Frontend/README.md`](Frontend/README.md) — estructura de la app, hooks de
  dominio, stores, flujos de pago/onboarding, variables de entorno.
- [`backend/README.md`](backend/README.md) — flujo gasless, endpoints,
  modelo de comisiones, comandos.

---

<div align="center">
<sub>LatamLink Pay · Payments / Fintech / Solana / Web3</sub>
</div>
