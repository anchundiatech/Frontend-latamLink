# LatamLink Pay — Informe de avance para el equipo

**Fecha:** 19 de agosto de 2026 · **Repo:** `anchundiatech/Frontend-latamLink`

---

## En una frase

El producto pasó de tener tres piezas que no se hablaban entre sí a **cobrar de
punta a punta en devnet**: el cliente paga sin necesitar SOL, el dinero se
reparte solo entre los destinos del comercio, y las comisiones llegan a la
wallet de la plataforma. Todo verificado con transacciones reales en la cadena.

## El problema que resolvimos

Antes había tres sistemas bien hechos por separado que **no estaban conectados**:

- La app guardaba el estado del comercio en el navegador (`localStorage`), así
  que se perdía al limpiar el navegador o cambiar de dispositivo.
- La API con PostgreSQL existía y **nadie la llamaba**.
- El relayer no existía todavía.

Y había dos problemas de negocio serios escondidos en el código:

1. **Las comisiones no eran nuestras.** El alta creaba el comercio con la
   wallet del comercio como dueño on-chain. El contrato solo permite retirar la
   bóveda de comisiones al dueño, así que con ese esquema las comisiones
   quedaban del lado del comercio.
2. **El cobro no pasaba por el contrato.** El QR del POS era una transferencia
   directa: el dinero iba del cliente al comercio sin reparto y **sin
   comisiones**.

Además, los dos caminos on-chain del navegador estaban rotos: el alta mandaba
billeteras donde el contrato exige cuentas de token, y el cobro pasaba la
billetera donde va la cuenta de token. Ninguno habría funcionado.

## Qué se construyó

### Rail de pagos (nuevo servicio, carpeta `backend/`)

- **Pagos sin gas**: el usuario firma solo su parte y la plataforma paga la
  comisión de red. El usuario nunca necesita SOL.
- **Alta de comercios** con la plataforma como dueño on-chain, validando
  destinos, porcentajes y comisiones antes de tocar la red.
- **Tesorería**: barrido de las comisiones acumuladas hacia la wallet de la
  plataforma.
- **Capa x402**: cobro por API en USDC sin API keys, con el estándar que ya
  adoptaron Visa, Stripe, Google y la Solana Foundation. Falta solo elegir el
  facilitador para activarla.

### Conexión con la app

- El alta y el cobro pasan por el backend a través de rutas del servidor, para
  que **ninguna credencial llegue al navegador**.
- El QR del POS ahora ejecuta el contrato (Solana Pay en modo *transaction
  request*): conserva el reparto y las comisiones, y el cliente sigue sin
  necesitar SOL porque la transacción viaja ya firmada por la plataforma.

### Seguridad

Se auditó todo y se corrigieron **3 fallos críticos, 5 altos y 6 medios**. Los
más graves:

| Fallo | Riesgo real |
|---|---|
| Cualquier request podía vaciar la wallet que paga el gas | Un atacante adjuntaba una comisión de prioridad arbitraria y nos costaba ~1,4 SOL en una sola transacción |
| El alta de comercios estaba abierta a cualquiera | Se podía quemar nuestro SOL en cuentas irrecuperables, o crear comercios "nuestros" con comisión cero |
| El historial de pagos era falsificable | Se podían inyectar cobros confirmados que nunca ocurrieron: fraude directo en un producto de cobros |
| El límite de gasto se apagaba en silencio | Un valor mal escrito en la configuración desactivaba las protecciones sin avisar |
| Un timeout podía cobrar dos veces al cliente | El POS daba el pago por fallido y pedía otro |

### El repo, operable

- **No se podía instalar con pnpm**: un archivo de configuración mal formado
  hacía fallar todos los comandos, hasta `pnpm --version`. Por eso convivían dos
  gestores de paquetes.
- **El despliegue en Vercel estaba roto** desde antes: nadie generaba el cliente
  de la base de datos, y dos servicios se inicializaban al compilar, cuando aún
  no hay variables de entorno.
- Se agregó **CI** que corre tipos, lint y tests de las tres áreas en cada PR, y
  un `.env.example` con las 15 variables que el proyecto necesita.

## Verificado en devnet, no solo escrito

Estas son transacciones reales:

| Prueba | Resultado |
|---|---|
| Pago sin gas dentro de la app | 10 USDC repartidos, cliente con 0 SOL · 2,3 s |
| Cobro por QR (como lo haría una billetera) | 2 USDC repartidos, cliente con 0 SOL |
| Reparto exacto | Comisión POS, 60/40 entre destinos y comisión de gas: **coinciden al peso** |
| Comisiones a la plataforma | 0,30845 USDC barridos del contrato a nuestra wallet |
| Rendimiento | 5/5 pagos exitosos, mediana de 1,75 s, ~0,00001 SOL por transacción |

Calidad: **46 tests automatizados** (16 de la app, 30 del rail de pagos), lint
sin errores, tipos en verde en las tres áreas, y despliegue de Vercel
funcionando.

## Cómo probarlo

```bash
# Rail de pagos
cd backend && cp .env.example .env   # completar ADMIN_API_KEY
PORT=3001 pnpm run dev

# App
cp .env.example .env                 # RELAYER_URL y RELAYER_ADMIN_API_KEY
pnpm run dev
```

## Qué falta

**Lo siguiente en importancia:**

1. **Guardar comercios y pagos en PostgreSQL.** El alta ya devuelve todos los
   datos y las tablas existen, pero la app todavía usa `localStorage`. Es lo que
   falta para que un comercio no pierda su configuración al cambiar de
   dispositivo.
2. **Conciliar los cobros por QR.** La billetera del cliente envía la
   transacción por su cuenta, así que hay que escuchar el evento del contrato
   para registrarlos en el historial.
3. **Elegir el facilitador de x402** y probar un cobro real: la capa ya está
   construida y probada.

**Después:** proteger las rutas del portal en el servidor (hoy el control de
administrador usa una variable pública), mover los límites anti-abuso a redis
para poder escalar a varias instancias, custodia de claves en KMS y auditoría
externa del contrato antes de mainnet.

## Estado de las ramas

| PR | Qué trae | Estado |
|---|---|---|
| #3 | Rail de pagos, x402, seguridad de la API, CI y despliegue | Fusionado en `backend` |
| #2 | API de catálogo (CRUD y historial) | Fusionado en `develop` |
| #4 | Conexión de la app con el rail de pagos | **Abierto, listo para revisar** |
