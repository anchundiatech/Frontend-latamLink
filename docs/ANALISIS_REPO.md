# Análisis del repositorio — qué falta

Revisión completa de `anchundiatech/Frontend-latamLink` (rama `backend` + el
aporte de `feat/relayer-gasless-x402`): frontend, API de catálogo, relayer y
capa x402. Fecha: 19 de agosto de 2026.

---

## El hallazgo principal: tres piezas que no se hablan

El repo tiene tres sistemas construidos con buen nivel cada uno, pero **ninguno
está conectado con los otros**:

| Pieza | Qué hace | De dónde saca los datos |
|---|---|---|
| Frontend (`src/app`, `src/components`) | Onboarding, POS, dashboard, split routing, admin | **localStorage** (Zustand `persist`) y lectura directa de la cadena |
| API de catálogo (`src/index.ts`, `src/controllers`) | CRUD de comercios, terminales, destinos y pagos sobre PostgreSQL | PostgreSQL vía Prisma |
| Relayer + x402 (`backend/`) | Arma, valida, firma y envía transacciones; cobro por API | Archivos JSONL (MVP) |

**La evidencia**: la única llamada del frontend a su propio backend es
`/api/waitlist`. No hay una sola llamada a `/api/merchants/*`. El estado del
comercio (nombre, terminal, destinos, PDAs) vive en el navegador con
`zustand/persist`, así que **si el usuario limpia el navegador o entra desde
otro dispositivo, su comercio desaparece**. La base de datos existe, está bien
modelada y no la usa nadie.

Éste es el trabajo de mayor impacto pendiente: no hay que construir piezas
nuevas, hay que **conectar las que ya están**.

---

## Estado por pieza

### Frontend — avanzado en superficie, sin fuente de verdad

Está bien: pantallas completas (landing, onboarding de 3 pasos, POS, dashboard,
transacciones, split routing, ajustes, admin), i18n, Privy integrado, animaciones
y algunos tests.

Le falta:

- **Persistencia real.** Todo el estado del comercio es local (ver arriba).
- **Protección de rutas.** No hay middleware de Next: `/portal/*` y `/admin` se
  resuelven en el cliente. El control de admin es
  `NEXT_PUBLIC_ADMIN_EMAILS` — una variable **pública**, comparada en el
  navegador. Hoy el panel solo lee datos on-chain, así que el daño se limita a
  ver información; en cuanto tenga acciones, es un agujero real.
- **Los dos cambios de modelo de negocio** ya documentados en
  `docs/INTEGRACION_BACKENDS.md`: el alta debe crear el comercio con la
  plataforma como owner, y el POS debe cobrar a través del contrato en vez de
  hacer una transferencia directa de Solana Pay (hoy **no hay split ni
  comisiones**).

### API de catálogo — funcional, pero no se puede exponer todavía

El modelo de datos es sólido y encaja con lo que produce el relayer. Pero tiene
problemas de seguridad que hay que cerrar **antes** de ponerla en internet:

**Crítico — no hay autenticación en ningún endpoint.** Cualquiera con la URL
puede crear, modificar y desactivar comercios, terminales y destinos.

**Crítico — el historial de pagos es falsificable.** `POST /api/merchants/payment`
acepta del cliente la firma, el monto, las comisiones y el estado; nada se
verifica contra la cadena. Se pueden inyectar pagos `CONFIRMED` inventados. En
un producto de cobros, eso es fraude directo: un comercio puede "probar" cobros
que nunca ocurrieron. Los pagos deberían escribirlos **solo** el relayer, que es
quien tiene la firma real, o verificarse contra el RPC antes de guardarlos.

**Alto — asignación masiva en las rutas PATCH.** `updateMerchant`,
`updateTerminal` y `updateDestination` pasan `req.body` entero a Prisma sin
esquema de validación (los `validateSchema` solo están en los POST). Se pueden
sobrescribir campos que nunca deberían cambiarse desde fuera:
`merchantIdOnchain`, `pdaAddress`, `totalVolume`, `feeBps`.

**Alto — `createTerminal` también pasa `req.body` directo.** El middleware valida
pero descarta el resultado saneado, así que las claves extra sobreviven: se
puede fijar a mano el `accessToken` de una terminal, que es justamente su
credencial de acceso.

**Medios.** Se devuelve el objeto de error al cliente (filtra detalles internos);
`getPaymentsByMerchant` no tiene paginación; hay un `PrismaClient` por módulo
más otro en `index.ts` (varios pools de conexión); quedaron archivos de respaldo
versionados (`merchantController copy.ts`, `.bk`).

### Relayer + x402 (`backend/`) — completo y auditado, falta ejecutarlo

Implementado, con 30 tests y auditoría propia (`docs/AUDITORIA_BACKEND.md`).
Le falta:

- **La corrida end-to-end en devnet**, bloqueada por el faucet: hay que fondear
  dos wallets a mano.
- **Elegir el facilitador x402** (la capa está construida y testeada; sin esa
  configuración no se monta, a propósito).
- **Persistir en Prisma** en lugar de archivos JSONL, ahora que sabemos que la
  base ya modela `Payment` y `Merchant`.
- Deuda consciente para producción: anti-replay y límites en memoria (necesitan
  redis con varias instancias) y custodia de claves en KMS.

### Contrato — hecho

Desplegado, auditado y documentado. Vive en el repo `LATAMLINKPAY`. Pendiente
antes de mainnet: auditoría externa profesional.

---

## Infraestructura: lo que no existe

Esto no es "deuda técnica", es lo que hace falta para que el proyecto sea
operable por más de una persona:

1. **No hay CI.** Ningún workflow: nada corre los tests ni el linter al abrir un
   PR. Hay tests en las tres áreas y nadie garantiza que sigan verdes.
2. **No hay `.env.example` en la raíz.** El proyecto necesita al menos 11
   variables (Privy, Supabase, RPC, Resend, tesorería, base de datos, admin) y
   ninguna está documentada: montar el entorno hoy es adivinar.
3. **No hay configuración de despliegue.** Ni Docker, ni Vercel, ni instrucciones.
   Con tres procesos (Next, API de catálogo, relayer) hace falta decidir cómo se
   levantan juntos.
4. **Conflicto de puertos.** Next, la API de catálogo y el relayer usan 3000 por
   defecto: en local no pueden convivir sin configurarlos.
5. **Dos gestores de paquetes.** Conviven `package-lock.json` y `pnpm-lock.yaml`.
   Como la regla del proyecto es pnpm, hay que borrar el de npm para que nadie
   instale con el equivocado.
6. **Sin migración de datos ni seeds.** Hay una migración inicial de Prisma y
   nada para poblar un entorno de prueba.

---

## Qué haría primero

Ordenado por impacto sobre el objetivo real: una demo funcional de punta a punta
que además genere ingresos.

**1. Conectar las piezas (lo más importante).**
El onboarding llama al relayer (`POST /merchants`), que crea las cuentas
on-chain con la plataforma como owner y devuelve las PDAs; la API de catálogo
las guarda; el frontend deja de depender de localStorage. El POS cobra por
`build`/`submit` en vez de por transferencia directa. Con eso el producto pasa a
tener split, comisiones y estado real compartido.

**2. Cerrar la API de catálogo.**
Autenticación en todos los endpoints, esquemas de validación en los PATCH, y que
los pagos los escriba únicamente el relayer. Sin esto no se puede exponer.

**3. Desbloquear la demo.**
Fondear devnet y correr `setup:devnet` → `e2e` → `bench`. Es el paso que
convierte "código escrito" en "producto que funciona", y es el criterio que más
pesa en el circuito.

**4. Hacer el repo operable.**
`.env.example`, CI que corra los tests de las tres áreas, puertos separados y un
gestor de paquetes único.

**5. Encender x402.**
Elegir facilitador y probar un cobro real. Es la pieza diferencial de la
narrativa: cobrar por API en USDC, sin API keys, abierto a agentes.

Después: liquidación híbrida de los ingresos x402, webhook al POS, tesorería
automática, redis y KMS, auditoría externa y mainnet.
