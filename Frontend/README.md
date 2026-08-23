<p align="center">
  <img src="public/Logo.webp" alt="LatamLink Pay" width="120" height="120" />
</p>

<h1 align="center">LatamLink Pay — Frontend</h1>

<p align="center">

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-000000?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-433E38?style=flat-square)
<br/>
![Solana](https://img.shields.io/badge/Solana-web3.js-9945FF?style=flat-square&logo=solana&logoColor=white)
![Solana Pay](https://img.shields.io/badge/Solana_Pay-9945FF?style=flat-square&logo=solana&logoColor=white)
![Solana Kit](https://img.shields.io/badge/@solana/kit-9945FF?style=flat-square&logo=solana&logoColor=white)
![SPL Token](https://img.shields.io/badge/SPL_Token-9945FF?style=flat-square&logo=solana&logoColor=white)
![Anchor](https://img.shields.io/badge/Anchor-Rust-121D33?style=flat-square&logo=rust&logoColor=white)
![Privy](https://img.shields.io/badge/Privy-Embedded_Wallets-1E1B4B?style=flat-square)

</p>

---

Dashboard y POS del comercio. No tiene lógica de Solana propia: arma
transacciones/QRs con datos que le da el backend y nunca firma nada con una
credencial de operador — eso vive del lado servidor de esta misma app
(`src/app/api/**`), que es el único que le habla al relayer y a la API de
catálogo.

## Cómo correrlo

```bash
pnpm install --frozen-lockfile
cp .env.example .env      # ver la tabla de variables más abajo
pnpm run dev               # http://localhost:3000
pnpm run lint
pnpm run test               # vitest
pnpm run build
```

Necesita el backend corriendo (local o apuntando a Render) para que el
onboarding y el POS funcionen — ver [`backend/README.md`](../backend/README.md).

## Variables de entorno

Definidas en `.env` (Next.js las carga desde esta carpeta, no desde la raíz
del repo). Ver `.env.example` para la lista completa comentada.

| Variable | Dónde se usa | Notas |
|---|---|---|
| `NEXT_PUBLIC_CLUSTER`, `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_PROGRAM_ID` | Cliente | Red de Solana y RPC. Públicas por definición. |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Cliente | App de Privy (login + wallet embebida). |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Cliente | Solo oculta/muestra el panel admin en la UI — **no** es control de acceso real. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente | Waitlist de la landing. |
| `RELAYER_URL`, `RELAYER_ADMIN_API_KEY` | Servidor | Hablan con `latamlink-relayer`. La API key debe coincidir con `ADMIN_API_KEY` del backend. |
| `CATALOG_API_URL`, `API_KEY`, `RELAYER_API_KEY` | Servidor | Hablan con `latamlink-catalog-api`. `API_KEY` debe coincidir con la del backend; `RELAYER_API_KEY` solo hace falta si esta app registrara pagos directamente (normalmente no). |
| `TREASURY_SECRET_KEY` | Servidor | Tesorería que patrocinaba SOL para el alta del comercio. Transitorio: con el alta vía relayer el comercio ya no necesita SOL. |
| `RESEND_API_KEY` | Servidor | Emails (waitlist). |

Ninguna variable server-only debe llevar el prefijo `NEXT_PUBLIC_`, y ninguna
de la tabla de servidor puede loguearse ni llegar al navegador.

## Estructura

```
src/
├── app/                    Rutas (App Router)
│   ├── page.tsx            Landing
│   ├── login/               Login (Privy)
│   ├── onboarding/           Alta de comercio (wizard de 2 pasos)
│   ├── portal/               App autenticada del comerciante
│   │   ├── dashboard/          Métricas, revenue, treasury
│   │   ├── pos/                 Terminal de cobro
│   │   ├── settings/            Fees, terminal, token, wallet, retiro
│   │   ├── split-routing/       Config de reparto (oculto del sidebar, ver abajo)
│   │   └── transactions/        Historial de cobros
│   ├── admin/                 Panel interno (edición de fees por comercio)
│   ├── proximamente/            Placeholder de features no lanzadas
│   └── api/                   Route handlers: únicos que hablan con los backends
│       ├── config/               Proxy a GET /config del relayer
│       ├── merchants/            Alta y consulta de comercio (relayer + catálogo)
│       ├── pay/                  Construcción de pago gasless (patrón legado, ver nota)
│       ├── payments/             Historial (catálogo) + confirmación de transferencia directa
│       ├── payouts/              Build/submit de retiro
│       └── waitlist/             Alta en la waitlist de la landing
├── components/              Solo UI — cero lógica de Solana o de negocio compleja
│   ├── pos/                   Keypad, QR, estados de pago, layouts adaptive/
│   ├── onboarding/            Wizard y sus 3 pasos
│   ├── dashboard/              Cards, gráfico de revenue, treasury summary
│   ├── settings/, transactions/, split-routing/, admin/, wallet/, landing/, shared/
├── lib/
│   ├── services/               Hooks de dominio (toda la lógica de pago vive acá)
│   ├── store/                   Estado global (Zustand)
│   ├── api/                     Clientes HTTP server-only hacia relayer y catálogo
│   ├── anchor/                  Lectura on-chain de la cuenta Merchant (solo lectura)
│   ├── actions/                 Server Actions (tesorería/sponsorship, legado)
│   ├── payments/                Tipos de estado de pago + cálculo de split (para mostrar en UI)
│   ├── hooks/                   Hooks genéricos sin lógica de negocio (device type, online, fullscreen)
│   └── i18n/                    Provider de idioma (es/en)
```

### `lib/services/` — hooks de dominio

| Hook | Para qué |
|---|---|
| `useCuentaDePago` | Resuelve la wallet de pago del comerciante desde la sesión de Privy (`useWallets` del subpath `/solana` — ver comentario en el archivo sobre por qué no usar `user.linkedAccounts`). |
| `useCreateMerchant` | Alta de comercio: llama a `POST /api/merchants`, que crea on-chain vía el relayer y guarda en Postgres vía el catálogo. |
| `useUpdateMerchantConfig` | Edita reparto/comisiones de un comercio existente (firma la plataforma, el comerciante nunca firma). |
| `useSolanaPay` | Genera el QR de cobro (`encodeURL` de `@solana/pay`, transfer request) y observa la referencia hasta que el pago confirma en cadena. |
| `usePOSController` | Orquestador único del POS: monto, token, paso (input/QR), timer, conectividad. Device-agnostic — los layouts `adaptive/` solo cambian la presentación. |
| `useRetiro` | Arma y envía el retiro del comerciante (`/api/payouts/build` + `/api/payouts/submit`). |
| `useTransactions` | Historial de cobros leído de Postgres (fuente de verdad para importes y comisiones ya repartidos). |
| `useMerchantSync` | Recupera el comercio guardado al iniciar sesión, por si el `localStorage` del navegador no lo tiene. |
| `usePrivyWallet` | Firma de transacciones con la wallet embebida (Solana Wallet Standard, vía `@privy-io/react-auth/solana`). |
| `useWalletsVinculadas` | Lista las cuentas vinculadas a la sesión de Privy (wallet externa, si el comerciante llegara a vincular una). |
| `priceFeed` | Cotización SOL/USD para mostrar equivalencias en el POS (no afecta el token que realmente se mueve on-chain). |

### `lib/store/` — estado global (Zustand)

- **`useMerchantStore`** — datos del comercio actual (nombre, PDA, wallet,
  destinos, fees, contador de pagos). Persistido en `localStorage`
  (`latamlink-merchant`).
- **`useTxStore`** — historial de transacciones cacheado (30s) desde
  Postgres.
- **`useNotificationStore`** — notificaciones de pagos confirmados.
- **`useAuthStore`** — **deprecado**, solo reexporta un objeto vacío. La
  sesión es de Privy directamente (`usePrivy()`), no hace falta un store
  propio.

No se agregan stores nuevos sin justificar por qué Context/props no alcanza.

### POS device-adaptive

`components/pos/adaptive/AdaptivePOSLayout.tsx` decide, según
`lib/hooks/useDeviceType.ts`, cuál de `POSMobileLayout` / `POSTabletLayout` /
`POSDesktopLayout` / `POSKioskLayout` (activado con `useFullscreen`) mostrar.
Los cuatro layouts comparten el mismo `usePOSController`: la máquina de
estados de pago es única, solo cambia la composición visual.

## Flujos principales

**Onboarding** (`app/onboarding` + `components/onboarding/OnboardingWizard.tsx`,
2 pasos): el comerciante entra con email vía Privy, que le crea la wallet
embebida sola; `StepConfigureTerminal` llama a `useCreateMerchant` con esa
wallet al 100% como único destino (el comerciante no toma decisiones cripto);
`StepStartAccepting` cierra el wizard.

**Cobro** (`app/portal/pos`): `usePOSController.handleGenerateQR` pide un QR a
`useSolanaPay`, que arma un link `solana:` con `@solana/pay` y observa la
`reference` on-chain. Al confirmar, avisa a `/api/payments/confirm` para que
el backend relea la transacción real y la registre en Postgres (ver
"Cómo funciona un cobro hoy" en el README raíz).

**Retiro** (`components/settings/RetiroSettings.tsx` + `useRetiro`): arma la
transacción en el backend, la firma el comerciante con su wallet embebida
(`usePrivyWallet`), y el backend la envía ya con la comisión de la plataforma
descontada en una segunda instrucción.

## Ocultos a propósito (no eliminados)

Estas features tienen código funcional pero están escondidas de la UI —
no borrar, solo no mostrarlas hasta que estén listas:

- **"Vincular mi billetera"** (`components/settings/WalletSettings.tsx`,
  flag `MOSTRAR_VINCULAR_WALLET`).
- **Split Routing** en el sidebar (`components/portal/Sidebar.tsx`) — la
  página (`app/portal/split-routing`) sigue existiendo, solo no hay link en
  el menú. Depende de una página de checkout con wallet-adapter que soporte
  el patrón "transaction request" (ver README raíz).
- **Login con Google en Privy** (`components/wallet/PrivyProvider.tsx`) —
  la credencial de OAuth todavía no está configurada en el dashboard de
  Privy.

## Testing

`vitest` con archivos `*.test.ts`/`*.test.tsx` junto al código que prueban
(no en una carpeta `__tests__` separada). Cubre principalmente
`lib/services/`, `lib/payments/split.ts` y componentes de POS con lógica de
formato/validación (`AmountDisplay`, `POSKeypad`, `TokenSelector`,
`PaymentStatus`, etc.). Si un cambio toca montos, fees, split o el flujo del
relayer, el PR debe incluir tests nuevos o actualizados — no es opcional.

## Paleta y diseño

La UI sigue un sistema de tokens fijo (fondo oscuro + acentos Solana/éxito/
alerta) y reglas de cards, onboarding y modo guía consistentes en toda la
aplicación. No se introducen colores ni degradados fuera de esa paleta.
