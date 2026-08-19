# Auditoría de seguridad del backend — hallazgos y correcciones

Fecha: 2026-08-18. Alcance: todo `backend/src/` y `backend/scripts/`, contrastado
contra el contrato desplegado. Aquí se mueve dinero real y el relayer gasta SOL
propio, así que la revisión es bloqueante antes de exponer el servicio.

**Resultado: 3 hallazgos críticos, 5 altos, 6 medios y 7 bajos. Todos los
críticos y altos están corregidos, con tests de regresión.**

---

## Críticos (corregidos)

### C1 — Un solo request podía vaciar el relayer
`src/relayer/validate.ts`

La whitelist aceptaba **cualquier** instrucción del programa ComputeBudget sin
mirar su contenido, y el gasto se contabilizaba con una constante de 10.000
lamports. Un atacante podía pedir la transacción a `/payments/build`, añadirle
`setComputeUnitPrice` con un precio arbitrario y firmarla: pasaba todas las
validaciones y el relayer pagaba una fee de prioridad de ~1,4 SOL, mientras el
contador diario registraba 10.000 lamports.

**Corrección**: se decodifica cada instrucción de ComputeBudget y solo se
aceptan `SetComputeUnitLimit` (≤ el límite que usa el propio backend) y
`SetComputeUnitPrice` (≤ `MAX_PRIORITY_MICROLAMPORTS`, 0 por defecto), una de
cada una como máximo; cualquier otra —incluida `RequestHeapFrame`— se rechaza.
El gasto que se reserva ahora es el fee **real**: firmas + fee de prioridad.

### C2 — El alta de comercios estaba abierta a cualquiera
`src/server.ts`

`POST /merchants` firmaba con la wallet de la plataforma sin pedir credencial.
Dos consecuencias: cada alta quema ~0,0085 SOL de renta que el contrato **no
permite recuperar** (no hay instrucción de cierre), y un tercero podía crear
comercios *propiedad nuestra* con comisiones en cero y destinos suyos,
convirtiendo el relayer en gas gratis permanente sin generar ingresos.

**Corrección**: credencial de operador obligatoria (`ADMIN_API_KEY`, comparación
en tiempo constante). Sin clave configurada el endpoint responde 503 en lugar de
quedar abierto. Además el `merchantId` ya no se acepta del cliente: lo decide el
servidor.

### C3 — El rate limiting se evadía con una cabecera
`src/server.ts`, `src/http/rateLimit.ts`

Con `trust proxy: true`, Express toma `req.ip` de `X-Forwarded-For`, que el
cliente controla. Bastaba variar esa cabecera en cada request para no alcanzar
nunca el límite — y el rate limiting es la barrera práctica que protege el SOL
del relayer.

**Corrección**: `TRUSTED_PROXY_HOPS` (0 por defecto, el número real de proxies
propios en producción). El mapa de contadores también tiene purga y techo para
que las IPs falsas no consuman memoria sin límite.

---

## Altos (corregidos)

| # | Problema | Corrección |
|---|---|---|
| H1 | El relayer subsidiaba pagos a **cualquier** comercio del programa, incluidos los creados por terceros con comisión cero: gas gratis sin ingresos | Se exige que `merchant.owner` sea la wallet de la plataforma |
| H2 | La firma del usuario solo se comprobaba por presencia, no criptográficamente, y el presupuesto se consumía antes de enviar: 10.000 requests con firmas basura dejaban el relayer inoperativo por el día | Verificación criptográfica real antes de tocar contadores; el presupuesto y el anti-replay se **devuelven** si la transacción no llega a enviarse |
| H3 | Un valor mal escrito en `.env` (`100_000_000`) daba `NaN`, y toda comparación con `NaN` es falsa: el límite diario y el rate limiting se apagaban **en silencio** | Validación de números al arrancar: el proceso no inicia con configuración inválida |
| H4 | El registro contable se reescribía entero en cada pago: dos pagos simultáneos se pisaban, y un archivo dañado borraba todo el histórico | Formato append-only (JSONL): sin reescrituras, tolerante a líneas corruptas |
| H5 | Un pago x402 podía canjearse varias veces reenviando la misma cabecera `X-PAYMENT` | Deduplicación por transacción liquidada, en memoria y persistida |

## Medios (corregidos)

| # | Problema | Corrección |
|---|---|---|
| M1 | x402 cobraba **antes** de saber si podía servir el recurso: un comercio inactivo devolvía 422 con el pago ya cobrado | Hook de precondición que valida antes de cobrar |
| M2 | El campo `resource` del 402 se armaba con la cabecera `Host` del cliente y acababa en los comprobantes de liquidación | Se construye desde `PUBLIC_BASE_URL` |
| M3 | `GET /payments` exponía wallets y montos de todos los comercios sin credencial, y un `limit` inválido volcaba el histórico completo | Credencial de operador + `limit` saneado (máx. 200) |
| M4 | El anti-replay crecía sin límite y nunca se purgaba: fuga de memoria y, al reiniciar, pérdida total de la protección | Expiración por TTL (180 s, más que la vida de un blockhash) y techo de entradas |
| M5 | Si la confirmación agotaba el timeout se devolvía error sin registrar nada, aunque la transacción podía confirmarse después: el POS pedía otro pago y **se cobraba dos veces** | El pago se registra como `pending` en cuanto entra a la red y el timeout devuelve **202** con la firma, para consultar en vez de recobrar |
| M6 | `merchantId` derivado de `Date.now()`: dos altas en el mismo milisegundo colisionaban | Identificador aleatorio de 64 bits |

## Bajos (corregidos)

- El límite de `posTerminalId` se medía en caracteres y el contrato lo mide en
  **bytes**: un identificador con acentos revertía on-chain quemando la fee.
- CORS no declaraba `X-PAYMENT` ni exponía `X-PAYMENT-RESPONSE`: ningún cliente
  x402 de navegador habría podido pagar al restringir orígenes.
- El decodificador de la cuenta del comercio no acotaba sus lecturas: un dato
  corrupto daba un `RangeError` en vez de un error claro.
- Los keypairs de prueba se escribían con permisos 0644; ahora 0600.

## Verificado correcto (no tocar)

Revisado campo por campo y cuenta por cuenta contra el contrato desplegado:

1. **Orden de cuentas** de `pay` (20 cuentas), `initialize_merchant` y
   `withdraw_gas_fees`: coinciden exactamente, incluidos los flags de firma y
   escritura.
2. **Decodificador Borsh** de la cuenta del comercio: coincide campo por campo,
   incluidos los prefijos de longitud de `String` y `Vec`.
3. **Orden de argumentos** de `initialize_merchant`, con el `String` y el array
   fijo al final (el arreglo que impuso la auditoría del contrato).
4. **Relleno de destinos** repitiendo el primero: correcto, el contrato exige
   las 10 cuentas siempre y solo itera sobre las configuradas.
5. **Transacciones versionadas / Address Lookup Tables**: no son un vector para
   esconder instrucciones — el parser rechaza mensajes versionados. Queda como
   invariante a vigilar si algún día se aceptan.
6. **Secretos**: ninguno hardcodeado, ninguno logueado, ninguno versionado.

## Deuda consciente (Fase 3)

- Anti-replay, límite diario y rate limiting viven en memoria: con varias
  instancias hay que moverlos a redis.
- La persistencia en archivos JSONL es suficiente para el MVP, no para
  producción: migrar a postgres (o al Supabase que ya usa el frontend).
- Custodia de keypairs en KMS/HSM y rotación de relayers.
- x402 liquida antes de ejecutar el handler: si el handler falla por un error
  interno, el pago ya se cobró. La precondición cubre los casos previsibles;
  cerrar el resto exige liquidación diferida.
