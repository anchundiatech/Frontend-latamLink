# Informe técnico de avance — LatamLink Pay

**Fecha:** 18 de agosto de 2026
**Alcance:** smart contract y backend (relayer gasless, modelo de comisiones y capa x402)
**Repositorio:** `XxHugheadxX/LATAMLINKPAY`, rama `feat/backend-relayer-x402`
(fusiona en `main` sin conflictos)

---

## 1. Resumen ejecutivo

El proyecto pasó de tener **solo el smart contract desplegado** a tener un
**backend completo y auditado** que cubre las tres capas del informe técnico
original: el rail de pagos on-chain, el relayer que hace los pagos *gasless*, y
la capa x402 que monetiza la plataforma como API.

| Componente | Antes | Ahora |
|---|---|---|
| Smart contract `latamlink_pay` | Desplegado en devnet | Desplegado y auditado (documentado) |
| Relayer gasless (Fase 1) | No existía | Implementado, endurecido y con tests |
| Modelo de comisiones | Sin resolver | Resuelto e implementado de punta a punta |
| Capa x402 (Fase 2) | No existía | Implementada con tests; falta elegir facilitador |
| Liquidación híbrida (Fase 3) | Diseño | Comprobantes ya registrados; falta el job de reparto |

**Calidad:** 30 tests automatizados en verde, TypeScript estricto sin errores y
una auditoría de seguridad con 3 hallazgos críticos, 5 altos y 6 medios —
**todos corregidos** y con tests de regresión.

**Único bloqueo:** el faucet de devnet tiene limitada la IP de desarrollo, así
que falta ejecutar la prueba de punta a punta contra la red real. Se resuelve
fondeando dos wallets a mano (2 minutos).

---

## 2. El problema de negocio que se resolvió: las comisiones

Era la pregunta central: el contrato acumula las comisiones en una bóveda
(`gas_vault`) por comercio, y esos fondos "no iban a ningún lado".

**Lo que dicta el contrato desplegado:** solo el `owner` del comercio puede
retirar esa bóveda, y solo hacia una cuenta de su propiedad. No hay forma de
desviar esos fondos a un tercero.

**La consecuencia de negocio:** todo depende de *quién sea el owner*. Si cada
comercio es su propio owner, sus comisiones son suyas y la plataforma no cobra
nada. Por eso el alta de comercios se hace **siempre desde nuestro backend, con
la wallet de la plataforma como owner on-chain**.

Con ese diseño, el dinero fluye así en cada pago:

| Concepto | Destino | Cuándo |
|---|---|---|
| Comisión POS (`pos_fee_bps`) | Cuenta de la plataforma | En cada pago, automático |
| Comisión de gas (`fee_bps`) + redondeos | `gas_vault` → plataforma | Acumula; se barre con `pnpm run tesoreria:gas` |
| Resto (≈98,5%) | Destinos del comercio | En cada pago, automático y trustless |

El comercio sigue cobrando de forma automática y verificable on-chain; la
plataforma es la única que puede tocar las comisiones. Ese USDC recaudado es lo
que financia el SOL que gasta el relayer, cerrando el modelo de costos que
planteaba el informe original.

**Efecto secundario valioso:** el comercio no firma nada on-chain ni necesita
SOL para darse de alta — la plataforma paga la renta de las cuentas.

---

## 3. Lo que se construyó

### 3.1 Relayer gasless (Fase 1)

El usuario paga en USDC y **nunca necesita SOL**. El flujo:

1. La app pide la transacción armada (`POST /payments/build`): el backend lee el
   comercio on-chain, resuelve las 20 cuentas que exige el contrato en el orden
   exacto y fija al relayer como pagador del fee de red.
2. El usuario firma **solo su parte** con su wallet embebida (Privy).
3. La app la devuelve (`POST /payments/submit`): el backend valida, firma como
   pagador del fee y la envía.

### 3.2 Alta de comercios y tesorería

- `POST /merchants` — crea el comercio con owner = plataforma, validando
  porcentajes, destinos, mints y comisiones **antes** de tocar la red. Protegido
  con credencial de operador.
- `pnpm run tesoreria:gas` — barre la bóveda de comisiones hacia la wallet de la
  plataforma.

### 3.3 Capa x402 (Fase 2)

Monetización de la plataforma como API: cobro por request en USDC, sin API keys
ni suscripciones, usando el estándar que ya adoptaron Visa, Stripe, Google,
Cloudflare y la Solana Foundation.

- Responde `402 Payment Required` con los requisitos de pago; el cliente paga y
  reintenta con la cabecera `X-PAYMENT`; se verifica y liquida contra un
  facilitador; recién entonces se entrega el recurso.
- Recursos cobrables: generación de QR de cobro y estadísticas de comercio.
- **Invariante absoluta, verificada por tests:** el recurso no se entrega jamás
  sin pago verificado *y* liquidado. Header ausente, ilegible, pago inválido, ya
  canjeado o liquidación fallida terminan en 402; facilitador caído degrada a
  503 con `Retry-After`. Nunca hay entrega optimista.
- Cada cobro deja un comprobante: es la entrada del reparto de Fase 3, que
  invocará `pay()` para que los ingresos x402 conserven el split on-chain.

Un detalle de diseño importante: el QR que genera la plataforma es una URL de
Solana Pay en modo *transaction request* que apunta a nuestro propio endpoint.
Así el cobro pasa por la instrucción `pay()` del contrato y conserva el split,
en lugar de ser una transferencia suelta que evitaría las comisiones.

---

## 4. Auditoría de seguridad

Se auditó todo el backend contra el contrato desplegado, cuenta por cuenta y
campo por campo. Los hallazgos críticos y altos **ya están corregidos**.

### Críticos

1. **Un solo request podía vaciar el relayer.** Se aceptaba cualquier
   instrucción de presupuesto de cómputo sin inspeccionarla: un atacante podía
   añadir un fee de prioridad arbitrario y hacer que el relayer pagara ~1,4 SOL
   en una transacción, mientras el contador registraba una fracción. *Corregido:
   solo se aceptan instrucciones acotadas y se contabiliza el fee real.*
2. **El alta de comercios estaba abierta.** Cualquiera podía gastar el SOL de la
   plataforma en rentas irrecuperables, o crear comercios *nuestros* con
   comisión cero y destinos suyos — gas gratis sin ingresos. *Corregido:
   credencial de operador obligatoria.*
3. **El rate limiting se evadía con una cabecera.** El backend confiaba en
   cualquier `X-Forwarded-For`. *Corregido: la confianza en proxies es explícita
   y por defecto nula.*

### Altos

- El relayer subsidiaba pagos a comercios de terceros (ahora exige que el
  comercio sea de la plataforma).
- La firma del usuario no se verificaba criptográficamente y el presupuesto se
  consumía antes de enviar: 10.000 requests con firmas falsas dejaban el relayer
  inoperativo por el día. *Corregido: verificación real y presupuesto reversible.*
- Un valor mal escrito en la configuración (`100_000_000`) apagaba **en
  silencio** el límite de gasto y el rate limiting. *Corregido: el proceso no
  arranca con configuración inválida.*
- El registro contable se reescribía entero en cada pago: dos pagos simultáneos
  se pisaban y un archivo dañado borraba el histórico. *Corregido: formato
  append-only.*
- Un pago x402 podía canjearse varias veces. *Corregido: deduplicación.*

### Medios destacados

- x402 cobraba antes de saber si podía servir el recurso (ahora valida primero).
- Un timeout de confirmación podía derivar en **cobrar dos veces** al usuario:
  ahora el pago se registra en cuanto entra a la red y el timeout devuelve 202
  con la firma, para consultar en vez de recobrar.
- El listado de pagos exponía wallets y montos de todos los comercios sin
  credencial.

### Verificado correcto

El orden de cuentas de las tres instrucciones usadas, el decodificador de la
cuenta del comercio y el orden de argumentos coinciden **exactamente** con el
contrato desplegado. No hay secretos versionados ni logueados.

---

## 5. Estado y qué falta

### Bloqueo activo

El faucet de devnet tiene limitada la IP de desarrollo. Para cerrar la prueba de
punta a punta hay que fondear a mano en `faucet.solana.com` (~1 SOL cada una):

- Relayer: `DDM73ECt8ASCkgSvpAjtTwa9vix5x15dGz5mP9mfiKKz`
- Plataforma: `68tvdDT395Ai1hRquw2JoPZigQHHrRQSYtyxPqw5R5Qg`

Con saldo: `pnpm run setup:devnet && pnpm run e2e && pnpm run bench` deja
verificado el pago gasless completo con el split comprobado y una línea base de
latencia y costo.

### Decisiones pendientes

1. **Facilitador x402** — es lo único que falta para activar una capa ya
   construida y testeada.
2. **Alineación del frontend.** Su rama `develop` hoy crea comercios con owner =
   comercio y cobra con transferencias directas de Solana Pay, sin pasar por el
   contrato: con ese esquema **no hay split ni comisiones**. Debe migrar a los
   endpoints de este backend. Es el punto de mayor impacto en ingresos.
3. **Almacenamiento de producción** (hoy archivos JSONL, suficientes para el MVP).

### Siguiente tramo

Job de reparto de los ingresos x402 vía `pay()` · webhook al POS al confirmarse
un pago · tesorería automática (comisiones en USDC → SOL para el relayer) ·
almacenamiento compartido y custodia de claves en KMS · auditoría externa del
contrato antes de mainnet.

---

## 6. Cómo verificarlo

```bash
cd backend
pnpm install
pnpm run typecheck   # TypeScript estricto, sin errores
pnpm run test        # 30 tests en verde
pnpm run dev         # backend en :3000
```

Documentación incluida en el repositorio: mapa del backend y modelo de
comisiones, auditoría del backend, auditoría del contrato, especificación de
x402, guía de integración para el frontend, estudio de avance y estado del
proyecto.
