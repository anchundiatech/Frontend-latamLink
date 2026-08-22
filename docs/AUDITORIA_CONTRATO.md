# Auditoría del contrato `latamlink_pay` — hallazgos y arreglos

> Informe de los problemas encontrados en la revisión de seguridad del smart
> contract y cómo se corrigieron. La versión corregida es la que está
> **desplegada en devnet** con Program ID
> `GSeGuv2K3meepgSHCehP5jGkRnjRZk96a9vsPSSJ7TjC`.
>
> **Método**: no existía un documento de auditoría guardado, así que este
> informe se reconstruyó comparando línea por línea la versión pre-auditoría
> (`lib.txt`, Program ID `3vNeQJWSWx4pnQnha5qksXoJC6NBfvBNS9rqnTAKrvSv`) contra
> la versión corregida y desplegada (`lib.rs` (repo LATAMLINKPAY)). Todo lo listado abajo
> está verificado en el diff real entre ambas versiones. Fecha: 2026-08-17.

---

## Resumen

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | Espacio de cuenta sin el discriminador de Anchor (8 bytes) | 🔴 Crítica | ✅ Corregido |
| 2 | Destinos del split sin validar (fondos podían perderse) | 🔴 Crítica | ✅ Corregido |
| 3 | Contextos con 10+ cuentas sin `Box` → stack overflow BPF | 🟠 Alta | ✅ Corregido |
| 4 | Orden de argumentos: `Vec`/`String` rompían la deserialización | 🟠 Alta | ✅ Corregido |
| 5 | `pos_terminal_id` sin límite de longitud | 🟡 Media | ✅ Corregido |
| 6 | `pos_fee_bps` sin tope de 100% | 🟡 Media | ✅ Corregido |
| 7 | Suma de porcentajes sin aritmética checked | 🟡 Media | ✅ Corregido |
| 8 | `pos_fee_destination` — cuenta nueva, blindada desde el diseño | 🔵 Preventivo | ✅ Incluido |

El fix del hallazgo 2 obligó a cambiar la **firma de las instrucciones**
`initialize_merchant` y `update_config` (los destinos ahora entran como cuentas,
no como argumento), por eso el contrato corregido se desplegó con un **Program
ID nuevo**. El backend ya está construido contra la versión corregida.

---

## Hallazgos en detalle

### 1. 🔴 Espacio de cuenta sin discriminador — corrupción de datos

**Antes**: `space = Merchant::INIT_SPACE`
**Después**: `space = 8 + Merchant::INIT_SPACE`

Toda cuenta de Anchor empieza con un discriminador de 8 bytes que `INIT_SPACE`
NO incluye. La cuenta `Merchant` se creaba 8 bytes más chica de lo necesario:
los últimos campos (`total_payments_received`, `total_volume`) no entraban y la
escritura fallaba o corrompía el final de la cuenta. Es el bug clásico #1 de
Anchor y era bloqueante para cualquier merchant real.

### 2. 🔴 Destinos del split sin validar — pérdida de fondos

**Antes**: `initialize_merchant` y `update_config` recibían
`destinations: Vec<Pubkey>` como argumento y lo guardaban **sin verificar nada
on-chain**: ni que las direcciones fueran token accounts reales, ni que fueran
del mint correcto, ni que no apuntaran al propio vault.

Consecuencias posibles: configurar como destino una cuenta inexistente o de
otro mint → todos los `pay()` de ese merchant revertirían (denegación de
servicio de su propio cobro), o peor, direcciones mal cargadas dejaban USDC
irrecuperable. Un destino apuntando al vault/gas_vault rompía la contabilidad
del split.

**Después**: los destinos entran como **cuentas tipadas**
(`destination_0..destination_9: Account<TokenAccount>`) — Anchor ya garantiza
que existen y son token accounts — y además se valida explícitamente cada uno:

- `mint == payment_token_mint` (error `InvalidMint`)
- distinto del vault (`DestinationCannotBeVault`) y del gas_vault
  (`DestinationCannotBeGasVault`)
- sin duplicados (`DuplicateDestination`)

Este cambio es el que alteró la firma de las instrucciones y motivó el
redespliegue con nuevo Program ID.

### 3. 🟠 Stack overflow de BPF por cuentas sin `Box`

Con 10 cuentas destino + vaults + merchant en un mismo contexto, los
`Account<'info, TokenAccount>` alojados en el stack superan el límite de 4 KB
por frame de la VM de Solana ("Stack offset exceeded"). Se corrigió envolviendo
las cuentas grandes en `Box<Account<...>>` en los contextos
`InitializeMerchant`, `UpdateConfig` y `Pay`, moviéndolas al heap.

### 4. 🟠 Argumentos dinámicos rompían la deserialización

Los argumentos `Vec<Pubkey>`/`Vec<u8>` de tamaño dinámico al principio de la
lista causaban fallos de deserialización de Borsh/Anchor. Se reemplazaron por
formas fijas y se reordenaron (el comentario `💡 SOLUCIÓN` en el código marca
el fix): `percentages: [u8; 10]` (array fijo) + `destinations_count: u8`, y el
`String` (`pos_terminal_id`) **al final** de la lista de argumentos.

⚠️ Relevante para cualquier cliente (backend/frontend): el orden de
serialización de los args de `initialize_merchant` es
`merchant_id, fee_bps, pos_fee_bps, min_payment_amount, destinations_count,
percentages[10], pos_terminal_id`.

### 5. 🟡 `pos_terminal_id` sin límite de longitud

Un string sin tope podía exceder el espacio asignado a la cuenta al guardarse.
Ahora: `MAX_TERMINAL_ID_LEN = 32`, se exige no-vacío y ≤ 32
(`InvalidParameter`), y el campo usa `#[max_len(32)]` en el struct para que
`INIT_SPACE` reserve lo correcto.

### 6. 🟡 `pos_fee_bps` sin tope

Se agregó `require!(pos_fee_bps <= 10_000)` (100%) en `initialize_merchant` y
`update_config` — sin esto un merchant mal configurado podía intentar cobrar
más del 100% y revertir todos los pagos (o combinado con fee_bps, drenar el
monto completo en fees).

### 7. 🟡 Suma de porcentajes sin checked math

La suma de porcentajes usaba `sum()` directo; ahora usa
`checked_add(...).ok_or(MathOverflow)` — consistente con el resto del contrato,
donde **toda** la aritmética de dinero es checked (`checked_mul/div/sub`).

### 8. 🔵 `pos_fee_destination` blindada desde el diseño

La cuenta que recibe el fee del POS (nueva en esta versión) se incorporó ya con
constraints de Anchor que impiden el ataque obvio (cualquiera pasando SU cuenta
para quedarse el fee):

```rust
#[account(mut,
  constraint = pos_fee_destination.owner == merchant.owner @ ErrorCode::Unauthorized,
  constraint = pos_fee_destination.mint == payment_token_mint.key() @ ErrorCode::InvalidMint)]
pub pos_fee_destination: Account<'info, TokenAccount>,
```

---

## Cambios funcionales que entraron junto con la auditoría

No son hallazgos de seguridad, pero explican el resto del diff:

- **Fee del POS (`pos_fee_bps`)**: nuevo fee que se cobra sobre el monto bruto
  y va directo a `pos_fee_destination` (cuenta del owner). El fee de gas
  (`fee_bps`) se calcula DESPUÉS, sobre el remanente. Orden del dinero en
  `pay()`: `pos_fee` → vault recibe el resto → `gas_fee` al gas_vault → split
  por porcentajes → polvo (dust) al gas_vault.
- **`pos_terminal_id`**: identificador de terminal en el merchant y en los
  eventos (`MerchantInitialized`, `PaymentProcessed`) para trazabilidad por POS.
- **Eventos enriquecidos**: `PaymentProcessed` ahora emite `pos_fee` y
  `gas_fee` por separado (antes un solo `fee`).
- Mensajes de error acortados (reduce el tamaño del binario BPF).

---

## Qué queda fuera (deuda conocida)

- **Auditoría externa profesional**: esta fue una revisión interna. Antes de
  mainnet con dinero real, el plan del proyecto contempla auditoría externa
  (Zellic/Neodyme, presupuestada) — ver estrategia del proyecto.
- El contrato desplegado es **inmutable por regla del proyecto**: no se
  modifica sin decisión explícita del humano; relayer y x402 se construyen
  encima.

## Archivos

- `lib.rs` (repo LATAMLINKPAY) — código fuente de la versión desplegada (copia de
  referencia; idéntica a lo que está on-chain en devnet).
- `anchor.test.ts` (repo LATAMLINKPAY) — suite de tests del contrato.
- el README del repo LATAMLINKPAY — documentación original del contrato.
