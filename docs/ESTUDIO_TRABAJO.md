# Estudio de trabajo pendiente — LatamLink Pay

> Cruce ítem por ítem entre lo que exige el informe técnico completo
> (`LatamLink_Pay_Informe_Completo`, julio 2026) + el documento de arquitectura,
> y lo que ya está construido y verificado en este repo. Cada ítem tiene estado
> real: ✅ hecho, 🟡 parcial, ❌ pendiente, ⛔ bloqueado. Fecha: 2026-08-18.

---

## Resumen del estudio

| Área | Avance | Qué falta (lo esencial) |
|---|---|---|
| Parte 1 — Smart contract | ✅ ~100% | Solo deuda: 2 observaciones menores + auditoría externa pre-mainnet |
| Parte 2 — Relayer gasless | 🟡 ~70% | Verificación E2E (⛔ faucet), tests, rate limiting, conciliación, tesorería |
| Parte 3 — x402 | 🟡 ~15% | Todo el código; el spec y las decisiones ya están |
| Frontend | ❌ 0% (otro repo) | Onboarding + dashboard + QR + flujo de firma Privy |
| Operación / producción | ❌ 0% | Persistencia, KMS, monitoreo, auditoría externa, mainnet |

---

## Parte 1 — Smart contract (lo que el informe da por hecho)

| Ítem | Estado | Evidencia / pendiente |
|---|---|---|
| Contrato desplegado (`GSeGuv2K3...7TjC`) | ✅ | Devnet; código en el repo LATAMLINKPAY |
| 5 instrucciones + validaciones + eventos | ✅ | Auditadas — ver `docs/AUDITORIA_CONTRATO.md` |
| Suite de tests del contrato | ✅ | `anchor.test.ts` (repo LATAMLINKPAY) |
| Obs. 1.7a: `update_config` no revalida destinos ≠ vault/gas_vault | ❌ | Decisión tuya: aceptar el riesgo (solo el owner puede dispararlo) o corregir y redesplegar en Fase 3 |
| Obs. 1.7b: error `DestinationsCountMismatch` declarado sin uso | ❌ | Cosmético; mismo destino que 1.7a |
| Auditoría externa profesional | ❌ | Requisito ANTES de mainnet (Zellic/Neodyme, presupuestada en la estrategia) |

## Parte 2 — Relayer gasless (checklist técnico 2.3 del informe)

### A) Wallet relayer
| Ítem | Estado |
|---|---|
| Keypair dedicada del relayer | ✅ `.keys/relayer.json` (gitignoreado) |
| Fondearla con SOL | ⛔ **BLOQUEADO** — faucet devnet 429; fondear a mano en faucet.solana.com |
| Monitoreo de saldo + alertas + refill automático | ❌ Fase 3 (tesorería) |
| Rotación entre varias wallets relayer | ❌ Post-MVP (escala) |

### B) Endpoint build
| Ítem | Estado |
|---|---|
| Resolución de TODAS las cuentas (PDAs, ATAs, 10 destinos en orden) | ✅ `src/relayer/service.ts` |
| `fee_payer = relayer` + ComputeBudget (1M CU) | ✅ |
| Pre-validación off-chain (activo, mínimo, ATAs existen) | ✅ |
| Campo "referencia del QR" en el request | ❌ Hoy no se recibe ni persiste — necesario para conciliación (E) |

### C) Firma del usuario (Privy)
| Ítem | Estado |
|---|---|
| Flujo documentado para la app (`signTransaction`, NO send) | ✅ `docs/INTEGRACION_FRONTEND.md` + artifact |
| Implementación real en la app | ❌ Vive en el repo del frontend — no arrancada |

### D) Endpoint submit (anti-abuso)
| Ítem | Estado |
|---|---|
| Whitelist de programas + una sola `pay` + rechazo de extras | ✅ `src/relayer/validate.ts` |
| Relayer aislado (fee_payer puro, no aparece en instrucciones) | ✅ |
| Re-check on-chain de merchant activo + mínimo | ✅ |
| Firma del usuario presente + anti-replay | ✅ (replay en memoria → redis en Fase 3) |
| Límite de gasto diario del relayer | ✅ (en memoria → redis en Fase 3) |
| **Rate limiting por usuario/IP** | ❌ Único punto del checklist D sin implementar |
| Manejo de blockhash expirado (reconstruir tx) | 🟡 El error llega claro al cliente; falta reintento/reconstrucción automática |
| **Tests del validador** | ❌ Código que protege dinero, sin tests — probable en local, sin devnet |
| **Verificación E2E real en devnet** | ⛔ Scripts listos (`e2e`, `bench`); bloqueados por el fondeo |

### E) Confirmación y conciliación
| Ítem | Estado |
|---|---|
| Confirmación de la tx (polling hasta confirmed) | ✅ |
| Listener del evento `PaymentProcessed` (webhook al POS con split detallado) | ❌ |
| Persistencia signature + referencia QR (contabilidad) | ❌ Requiere elegir almacenamiento (sqlite/postgres) |

### F) Modelo de costos (recupero del SOL)
| Ítem | Estado |
|---|---|
| Job de tesorería: retirar `gas_vault` (USDC) → swap a SOL → refondear relayer | ❌ Fase 3; decisión de producto (DEX vs OTC) |

### G) Sin cambios al contrato
| Ítem | Estado |
|---|---|
| Todo construido encima, contrato intocado | ✅ Cumplido |

## Parte 3 — x402 (Fase 2 del roadmap)

| Ítem | Estado |
|---|---|
| Spec técnico + decisión de liquidación híbrida | ✅ `docs/SPEC_X402.md` |
| Elección del facilitador (Coinbase CDP vs alternativas, soporte solana-devnet) | ❌ **Decisión tuya** — primer paso de la fase |
| Endpoint que responde 402 con `PaymentRequirements` | ❌ |
| Verificación del header `X-PAYMENT` vía facilitador (nunca entregar sin pago confirmado) | ❌ |
| Tesorería x402 (cuenta USDC separada del relayer) | ❌ |
| Recursos monetizables: `POST /x402/qr` (QR programático), stats de merchant | ❌ |
| Job de liquidación híbrida: tesorería → `pay()` para conservar el split (Fase 3) | ❌ Diseñado en el spec |
| Degradación: facilitador caído → 503 + Retry-After | ❌ |

## Fuera del informe técnico (otros docs + estado del repo)

| Ítem | Estado |
|---|---|
| Frontend no-code (onboarding 3 pasos + dashboard + QR) | ❌ Otro repo; ya tiene informe de integración listo |
| CORS + `GET /config` en el backend (lo necesita el frontend) | ❌ Corto, sin dependencias |
| Revisión `revisor-codigo` del backend (flujo del kit, bloqueante: mueve dinero) | ❌ |
| Línea base del benchmark en `docs/LOOPS.md` | ⛔ Depende del E2E |
| Repo en GitHub | ❌ 5 commits locales sin remoto — requiere que ejecutes `gh repo create` |
| Custodia productiva del keypair (KMS/HSM) | ❌ Fase 3 |
| Mainnet | ❌ Al final: requiere auditoría externa + todo lo anterior estable |

---

## Orden de trabajo propuesto (por dependencias y valor)

**Ya / sin bloqueos (backend):**
1. Tests del validador anti-abuso (offline, no necesita devnet)
2. CORS + `GET /config` para el frontend
3. Rate limiting por IP/usuario en `/payments/submit` (cierra el checklist D)
4. Campo `reference` en build + persistencia mínima de pagos (sqlite) — habilita conciliación
5. Revisión `revisor-codigo` de todo el backend

**En cuanto haya SOL (⛔ hoy):**
6. `setup:devnet` → E2E verde → benchmark → **Hito 1 CERRADO = demo funcional**

**Decisiones que solo puede tomar el humano:**
- OK para arrancar Fase 2 (x402) + elección de facilitador
- Layout de repos y subida a GitHub
- Obs. 1.7 del contrato: ¿aceptar o corregir en el redeploy de Fase 3?
- Almacenamiento de persistencia (sqlite vs postgres)

**Después (Fase 2 → 3):** endpoints x402 → listener PaymentProcessed + webhooks →
tesorería (gas_vault → SOL) → redis para anti-replay/límites → KMS → auditoría
externa → mainnet.

---

## Plan de trabajo ejecutable

Organizado en hitos cerrables, cada uno con criterio de "hecho" verificable.
"Equipo" = trabajo de desarrollo; "Humano" = acción o decisión del responsable
del proyecto (fondeos, accesos, decisiones de producto).

### Hito A — Endurecer Fase 1 (arranca YA, sin bloqueos) · 1–2 sesiones
| # | Tarea | Quién | Hecho cuando… |
|---|---|---|---|
| A1 | Tests offline del validador anti-abuso (fee payer falso, instrucción extra, discriminador ajeno, relayer infiltrado, firma faltante, replay, límite diario) | Equipo | `pnpm test` verde con ≥8 casos de rechazo + 1 de aceptación |
| A2 | CORS configurable por env + `GET /config` (mint, merchant demo, decimales) | Equipo | El frontend puede leer config desde otro origen |
| A3 | Rate limiting por IP en `/payments/build` y `/payments/submit` | Equipo | Requests en exceso reciben 429; test lo cubre |
| A4 | Campo `reference` (QR) en build + persistencia de pagos en sqlite (signature, merchant, monto, reference, estado) | Equipo | Cada pago consultable; base de la conciliación |
| A5 | Revisión con agente `revisor-codigo` (Opus) de todo `backend/src` | Equipo | Hallazgos corregidos o descartados con razón escrita |
| A6 | Subir repo a GitHub | Humano | `! gh repo create latamlinkpay --private --source=. --remote=origin --push` |

### Hito B — Cerrar Fase 1 con demo E2E (⛔ hasta fondeo) · 1 sesión
| # | Tarea | Quién | Hecho cuando… |
|---|---|---|---|
| B1 | Fondear relayer `DDM73...iKKz` y owner `68tv...R5Qg` (~1 SOL c/u) en faucet.solana.com | Humano | Saldos > 0 (se verifican por RPC) |
| B2 | `pnpm run setup:devnet` (mint + ATAs + merchant demo on-chain) | Equipo | `devnet-state.json` con direcciones reales |
| B3 | `pnpm run e2e` — pago gasless completo, split verificado, usuario con 0 SOL | Equipo | E2E verde con link al explorer |
| B4 | `pnpm run bench` + registrar línea base en `docs/LOOPS.md` | Equipo | p50 y lamports/tx anotados |
| B5 | Actualizar informe frontend con mint/merchant reales + `documentador` cierra ESTADO_PROYECTO | Equipo | Artifacts republicados |

### Hito C — Fase 2: x402 MVP en devnet (necesita tu OK) · 2–3 sesiones
| # | Tarea | Quién | Hecho cuando… |
|---|---|---|---|
| C1 | Elegir facilitador (relevar opciones con soporte solana-devnet y decidir) | Equipo→Humano | Facilitador decidido y anotado en SPEC_X402 |
| C2 | Endpoint 402: `PaymentRequirements` (solana, USDC, monto, tesorería) | Equipo | `curl` sin pago recibe 402 bien formado |
| C3 | Verificación de `X-PAYMENT` vía facilitador — el recurso JAMÁS se entrega sin pago confirmado | Equipo | Test: sin pago → 402; con pago verificado → 200 |
| C4 | Primer recurso monetizado: `POST /x402/qr` | Equipo | Un cliente x402 real paga y recibe su QR |
| C5 | Degradación: facilitador caído → 503 + Retry-After | Equipo | Test con facilitador simulado caído |

### Hito D — Fase 3: liquidación híbrida + producción · 3+ sesiones
Job tesorería x402 → `pay()` (conserva el split) · listener `PaymentProcessed` +
webhook al POS · tesorería gas_vault→SOL (refill del relayer) · redis para
anti-replay/límite diario · KMS para el keypair · decisión obs. 1.7 del contrato
· auditoría externa · mainnet. Se detalla al cerrar C.

### Ruta crítica hacia la demo del circuito Dev3Pack/The Bridge
`B1 (vos, 2 min)` → B2→B3→B4 = **demo funcional de punta a punta**, el criterio
número uno del circuito. Todo el Hito A avanza en paralelo sin esperar nada.
