# Integración Frontend — LatamLink Pay

> Informe de traspaso para el repo del frontend. Cubre todo lo que la app
> necesita para cobrar con el rail gasless: endpoints del backend, flujo de
> firma con Privy, datos on-chain, manejo de errores y lo que aún está
> pendiente del lado backend. Actualizado: 2026-08-17.

---

## 1. Qué hace el backend (en una frase)

El usuario paga en USDC **sin tener SOL jamás**: el frontend pide la transacción
armada al backend, el usuario firma **solo su parte** con su wallet embebida
(Privy), y el backend la firma como *fee payer* (relayer) y la envía a Solana.
El contrato on-chain reparte el pago automáticamente entre hasta 10 destinos.

```
[Frontend]                      [Backend relayer]                [Solana devnet]
POST /payments/build  ───────►  arma la tx (fee_payer=relayer)
◄───────  { transaction (base64 sin firmas), blockhash, ... }
usuario firma con Privy
(signTransaction, NO send)
POST /payments/submit ───────►  valida anti-abuso + firma + envía ───►  pay()
◄───────  { signature, slot }                                    split automático
```

---

## 2. Datos on-chain (constantes)

| Dato | Valor |
|---|---|
| Red | **devnet** (todo se prueba aquí antes de mainnet) |
| Programa `latamlink_pay` | `GSeGuv2K3meepgSHCehP5jGkRnjRZk96a9vsPSSJ7TjC` |
| Token de pago | Mint SPL de prueba de **6 decimales** (propio, no el USDC-dev de Circle) |
| Explorer | `https://explorer.solana.com/tx/<signature>?cluster=devnet` |

**Unidades**: `amount` siempre va en unidades mínimas del token (6 decimales).
`1 USDC = 1_000_000`. El frontend convierte antes de llamar al backend y nunca
manda decimales.

**⏳ Direcciones pendientes**: el mint de prueba y el merchant demo se crean con
`pnpm run setup:devnet`, hoy bloqueado por el rate-limit del faucet de devnet.
Cuando corra, las direcciones quedan en `backend/devnet-state.json` y hay que
copiarlas a la config del frontend. Hasta entonces usá placeholders.

---

## 3. Endpoints del backend

Base URL local: `http://localhost:3000` (variable `PORT` del backend).
Todos los bodies son JSON (`Content-Type: application/json`, límite 100 KB).

### `GET /health`

Respuesta `200`:
```json
{ "ok": true, "relayer": "<pubkey base58 del relayer>" }
```
Usalo como check de disponibilidad antes de iniciar un cobro.

### `POST /payments/build` — paso 1

Pide la transacción armada para que el usuario la firme.

Request:
```json
{
  "merchantAddress": "<PDA del merchant, base58>",
  "payerPubkey": "<wallet Privy del usuario, base58>",
  "amount": "1000000"
}
```
- `amount`: string o number, en unidades mínimas (string recomendado — evita
  perder precisión con montos grandes).

Respuesta `200`:
```json
{
  "transaction": "<tx serializada base64, SIN firmas>",
  "blockhash": "<blockhash usado>",
  "lastValidBlockHeight": 123456789,
  "amount": "1000000",
  "merchant": "<merchantAddress>"
}
```

Errores:
- `400` — falta algún campo o tiene tipo inválido.
- `422` — con `{ "error": "<mensaje>" }`. Casos reales:
  - `"El comercio está inactivo"`
  - `"Monto X menor al mínimo Y"` (el merchant define `min_payment_amount`)
  - `"ATA del pagador no existe: <address>"` — el usuario no tiene cuenta del
    token (ver §6)

### `POST /payments/submit` — paso 2

Recibe la tx firmada por el usuario; el backend valida, firma como fee payer y
la envía. **Espera la confirmación** (hasta 60 s) antes de responder.

Request:
```json
{ "transaction": "<tx base64 con la firma del usuario>" }
```

Respuesta `200` (pago confirmado on-chain):
```json
{ "signature": "<firma de la tx, base58>", "slot": 123456790 }
```

Errores `422` con `{ "error": "<mensaje>" }`:
- Validación anti-abuso rechazó la tx (programa no permitido, instrucción
  extra, falta la firma del usuario, replay, etc.). Si el frontend usa la tx
  tal cual vino de `/build` y solo agrega la firma del usuario, esto no ocurre.
- `"Transacción falló on-chain: ..."` — la simulación/ejecución revirtió.
- `"Timeout esperando confirmación de <sig>"` — la tx puede haber entrado
  igualmente: verificá la `signature` en el explorer antes de reintentar.

---

## 4. Flujo en el frontend (con Privy)

Regla de oro: **el usuario firma, nunca envía**. Con Privy se usa
`signTransaction` (no `sendTransaction`) — el envío lo hace el backend.

```ts
import { Transaction } from "@solana/web3.js";

async function pagarGasless(params: {
  merchantAddress: string;
  payerPubkey: string;   // wallet Privy del usuario
  amountUsdc: number;    // en USDC "humanos", ej. 1.5
}) {
  // 1. Pedir la tx armada
  const buildRes = await fetch(`${BACKEND_URL}/payments/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchantAddress: params.merchantAddress,
      payerPubkey: params.payerPubkey,
      amount: BigInt(Math.round(params.amountUsdc * 1_000_000)).toString(),
    }),
  });
  if (!buildRes.ok) throw new Error((await buildRes.json()).error);
  const { transaction } = await buildRes.json();

  // 2. Firmar SOLO la parte del usuario con Privy
  const tx = Transaction.from(Buffer.from(transaction, "base64"));
  const signedTx = await privyWallet.signTransaction(tx); // hook de Privy Solana

  // 3. Enviar la tx firmada al relayer
  const submitRes = await fetch(`${BACKEND_URL}/payments/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transaction: signedTx
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64"),
    }),
  });
  if (!submitRes.ok) throw new Error((await submitRes.json()).error);
  return (await submitRes.json()) as { signature: string; slot: number };
}
```

Notas:
- No modifiques la transacción entre build y submit (ni agregues
  instrucciones): la validación anti-abuso del relayer la rechaza.
- El `submit` es **bloqueante hasta confirmación** — mostrá un estado
  "confirmando pago…" (típico: 1–5 s en devnet; timeout del backend: 60 s).
- En browser puede no existir `Buffer`: usá un polyfill o
  `Uint8Array.from(atob(b64), c => c.charCodeAt(0))`.

---

## 5. Manejo de errores recomendado en UI

| Situación | Detección | Acción del frontend |
|---|---|---|
| Blockhash expirado (usuario tardó en firmar) | `422` en submit con error on-chain de blockhash | Repetir desde `/payments/build` (la tx expira en ~60–90 s; re-armar es gratis) |
| Usuario sin cuenta del token | `422` en build: `"ATA del pagador no existe"` | Onboarding: el usuario necesita recibir el token al menos una vez (crear su ATA es parte del alta, no del pago) |
| Saldo USDC insuficiente | La tx revierte on-chain en submit | Chequear el saldo del ATA antes de ofrecer pagar (via RPC `getTokenAccountBalance`) |
| Monto bajo el mínimo | `422` en build con el mínimo en el mensaje | Validar el mínimo en el form antes de llamar |
| Backend caído / RPC caído | `fetch` falla o `/health` no responde | Mensaje claro + reintento; el pago nunca queda "a medias" si build falló |
| Timeout en submit | `422` "Timeout esperando confirmación" | NO reintentar a ciegas: consultar la `signature` en el explorer/RPC primero |

---

## 6. Requisitos del usuario pagador

- **SOL: cero.** No pedir, no chequear, no fondear — es el punto del producto.
- **Token de pago**: necesita su ATA creado y con saldo. En devnet el mint es
  nuestro y el backend puede mintear saldo de prueba a demanda.
- **Wallet**: Privy embebida (o cualquier wallet que exponga `signTransaction`).

---

## 7. Pendientes que afectan al frontend

1. **CORS**: el backend hoy NO tiene middleware CORS — un frontend servido
   desde otro origen va a fallar en el browser. Pedirlo al backend antes de la
   primera integración real (una línea de Express, pero hay que decidir los
   orígenes permitidos).
2. **Direcciones devnet** (mint de prueba, merchant demo): bloqueadas por el
   faucet de devnet; saldrán de `backend/devnet-state.json` tras
   `pnpm run setup:devnet`.
3. **Autenticación de endpoints**: hoy los endpoints son abiertos (MVP devnet).
   El anti-abuso protege el SOL del relayer, pero para producción habrá API
   keys o similar — no diseñar el frontend asumiendo endpoints públicos.
4. **Fase 2 (x402)**: habrá endpoints nuevos (`POST /x402/qr`, stats) para
   monetizar la API; no existen todavía — no integrar nada x402 aún.

---

## 8. Config sugerida para el frontend

```env
# .env del frontend (ajustar por entorno)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_MERCHANT_ADDRESS=<pendiente: sale de devnet-state.json>
NEXT_PUBLIC_PAYMENT_TOKEN_MINT=<pendiente: sale de devnet-state.json>
NEXT_PUBLIC_TOKEN_DECIMALS=6
```

Reglas del proyecto que también aplican al frontend: **pnpm siempre** (nunca
npm/npx), TypeScript estricto, secretos solo en `.env` (gitignoreado), y los
datos sensibles (wallets, montos) no salen a servicios externos.
