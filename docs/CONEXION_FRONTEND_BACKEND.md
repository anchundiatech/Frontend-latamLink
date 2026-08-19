# Cómo quedó conectado el frontend con el backend

Antes había tres piezas que no se hablaban: la app leía de `localStorage` y de
la cadena, la API de catálogo existía sin que nadie la llamara, y el relayer
vivía aparte. Este documento describe el cableado que las une y qué cambió en el
comportamiento del producto.

## El principio: las credenciales no salen del servidor

La app no llama al relayer desde el navegador. Todo pasa por rutas de la propia
app (`src/app/api/**`), que corren en el servidor y son las únicas que conocen
la credencial de operador (`RELAYER_ADMIN_API_KEY`). El cliente del relayer
(`src/lib/api/relayer.ts`) está marcado `server-only`, así que un import
accidental desde un componente de cliente **no compila** en vez de filtrar la
clave.

| Ruta de la app | Qué hace | Credencial |
|---|---|---|
| `GET /api/config` | Mint en uso, decimales, programa, comercio demo | — |
| `POST /api/merchants` | Alta del comercio on-chain | operador |
| `POST /api/payments/build` | Paso 1 del pago sin gas | — |
| `POST /api/payments/submit` | Paso 2: validar, firmar y enviar | — |
| `GET`/`POST /api/pay` | Cobro por QR (Solana Pay) | — |

## Qué cambió en el alta de comercios

Antes el navegador creaba el comercio con la wallet del comercio como `owner`, y
para eso había que **patrocinarle SOL** (`sponsorMerchantSetup`). Eso dejaba las
comisiones del lado del comercio, porque el contrato solo permite retirar el
`gas_vault` al owner.

Ahora el alta la hace el relayer con la wallet de la plataforma:

- Las comisiones (POS y gas) quedan del lado de la plataforma.
- El comercio **no firma nada on-chain ni necesita SOL**; desaparece la
  necesidad de patrocinarlo.
- Los destinos se validan antes de tocar la red: el contrato exige **cuentas de
  token** del mismo mint, y el flujo anterior enviaba billeteras, así que el
  alta habría revertido on-chain sin explicación.
- El monto mínimo se convierte a unidades mínimas. El comercio escribe "1"
  pensando en 1 USDC; antes se mandaba `1`, que on-chain es una millonésima.

## Qué cambió en el cobro

Antes el QR era una transferencia directa de Solana Pay: el dinero iba del
cliente al comercio **sin pasar por el contrato**, o sea sin reparto entre
destinos y sin comisiones. El flujo alternativo del navegador tampoco servía:
pasaba la billetera como `payerTokenAccount` cuando el contrato espera la cuenta
de token.

Ahora el QR apunta a `/api/pay` en modo *transaction request* de Solana Pay:

1. La billetera del cliente lee el QR y pide la transacción a la app.
2. La app se la pide al relayer, que la arma ejecutando `pay()` y **la firma
   como pagador del fee de red**.
3. La billetera añade la firma del cliente y la envía ella misma.

Resultado: el cobro conserva el reparto y las comisiones, y el cliente sigue sin
necesitar SOL. La transacción lleva además una clave de referencia como cuenta
extra de solo lectura (técnica estándar de Solana Pay, que el contrato ignora),
para que el POS pueda reconocer su cobro sin conocer la firma de antemano.

## Verificado contra devnet

`pnpm --dir backend run e2e:qr` recorre el camino completo como lo haría una
billetera y comprueba el reparto peso por peso. Última corrida:

| Concepto | Movimiento | Esperado |
|---|---|---|
| Cliente pagó | 2 000 000 | 2 000 000 ✓ |
| Comisión POS | 10 000 | 10 000 ✓ |
| Destino A (60%) | 1 182 060 | 1 182 060 ✓ |
| Destino B (40%) | 788 040 | 788 040 ✓ |
| Comisión de gas | 19 900 | 19 900 ✓ |
| SOL del cliente | 0 | 0 ✓ |

## Cómo levantarlo en local

```bash
# 1. Relayer (servicio de pagos)
cd backend && cp .env.example .env   # completar ADMIN_API_KEY
PORT=3001 pnpm run dev

# 2. App
cp .env.example .env                 # RELAYER_URL y RELAYER_ADMIN_API_KEY
pnpm run dev                         # :3000
```

`RELAYER_ADMIN_API_KEY` de la app y `ADMIN_API_KEY` del relayer tienen que
coincidir; si no, el alta de comercios responde 401.

## Lo que queda pendiente

- **Guardar el comercio y los pagos en PostgreSQL.** El alta ya devuelve las
  PDAs y la API de catálogo tiene las tablas listas (`Merchant`, `Payment`),
  pero la app todavía guarda el estado del comercio en `localStorage`: se pierde
  al limpiar el navegador o cambiar de dispositivo.
- **Conciliar los cobros por QR.** La billetera envía la transacción por su
  cuenta, así que el relayer no se entera: hace falta escuchar el evento
  `PaymentProcessed` (o vigilar la referencia) para registrarlos.
- **Protección de rutas en servidor.** `/portal` y `/admin` se resuelven en el
  cliente y el control de administración usa una variable pública.
