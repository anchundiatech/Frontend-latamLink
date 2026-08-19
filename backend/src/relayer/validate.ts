import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { PAY_COMPUTE_UNIT_LIMIT, PAY_DISCRIMINATOR, PROGRAM_ID } from "../solana/constants.js";
import { decodeMerchant } from "../solana/merchant.js";
import {
  MAX_PRIORITY_MICROLAMPORTS,
  RELAYER_DAILY_LAMPORTS_CAP,
  platformOwnerPubkey,
} from "../config.js";

// Anti-replay con expiración: una firma solo puede reusarse mientras su
// blockhash siga vivo (~90 s), así que guardarlas para siempre solo servía
// para agotar la memoria del proceso.
const REPLAY_TTL_MS = 180_000;
const MAX_REPLAY_ENTRIES = 50_000;
const seenSignatures = new Map<string, number>();

// Límite de gasto diario del relayer (MVP en memoria).
let spentLamportsToday = 0;
let spentDay = new Date().toDateString();

const LAMPORTS_PER_SIGNATURE = 5_000;

// Discriminadores del programa ComputeBudget.
const CB_SET_COMPUTE_UNIT_LIMIT = 2;
const CB_SET_COMPUTE_UNIT_PRICE = 3;

export interface ValidatedPayment {
  payer: PublicKey;
  merchant: PublicKey;
  amount: bigint;
  replayKey: string;
  reservedLamports: number;
}

function purgeExpired(now: number): void {
  for (const [key, expiry] of seenSignatures) {
    if (expiry <= now) seenSignatures.delete(key);
  }
}

function reserveDailySpend(lamports: number): void {
  const today = new Date().toDateString();
  if (today !== spentDay) {
    spentDay = today;
    spentLamportsToday = 0;
  }
  if (spentLamportsToday + lamports > RELAYER_DAILY_LAMPORTS_CAP) {
    throw new Error("Límite diario de gasto del relayer alcanzado");
  }
  spentLamportsToday += lamports;
}

// Si la transacción no llega a enviarse, ni el presupuesto ni el anti-replay
// deben quedar consumidos: si no, cualquiera apaga el relayer por el día
// mandando transacciones que fallan a propósito.
export function rollbackReservation(validated: ValidatedPayment): void {
  spentLamportsToday = Math.max(0, spentLamportsToday - validated.reservedLamports);
  seenSignatures.delete(validated.replayKey);
}

// El relayer paga el fee de red, así que solo acepta las instrucciones de
// ComputeBudget que él mismo pondría. Sin esto, un cliente puede adjuntar
// setComputeUnitPrice con un precio arbitrario y vaciar el relayer en una
// sola transacción.
function inspectComputeBudget(instructions: TransactionInstruction[]): {
  units: number;
  microLamports: number;
} {
  let units = 0;
  let microLamports = 0;
  let sawLimit = false;
  let sawPrice = false;

  for (const ix of instructions) {
    const data = Buffer.from(ix.data);
    const kind = data[0];

    if (kind === CB_SET_COMPUTE_UNIT_LIMIT) {
      if (sawLimit) throw new Error("Instrucción ComputeBudget duplicada");
      if (data.length < 5) throw new Error("Instrucción ComputeBudget malformada");
      sawLimit = true;
      units = data.readUInt32LE(1);
      if (units > PAY_COMPUTE_UNIT_LIMIT) {
        throw new Error(
          `Límite de cómputo ${units} superior al permitido (${PAY_COMPUTE_UNIT_LIMIT})`,
        );
      }
      continue;
    }

    if (kind === CB_SET_COMPUTE_UNIT_PRICE) {
      if (sawPrice) throw new Error("Instrucción ComputeBudget duplicada");
      if (data.length < 9) throw new Error("Instrucción ComputeBudget malformada");
      sawPrice = true;
      const price = data.readBigUInt64LE(1);
      if (price > BigInt(MAX_PRIORITY_MICROLAMPORTS)) {
        throw new Error(
          `Fee de prioridad ${price} superior al permitido (${MAX_PRIORITY_MICROLAMPORTS})`,
        );
      }
      microLamports = Number(price);
      continue;
    }

    throw new Error("Instrucción ComputeBudget no permitida");
  }

  return { units, microLamports };
}

// Reglas (ver informe, Parte 2.3.D):
//  1. Solo instrucciones esperadas: latamlink_pay (exactamente una, y que sea
//     `pay`) + ComputeBudget acotado. Nada más.
//  2. fee_payer = relayer y el relayer NO aparece en ninguna instrucción.
//  3. El merchant existe, es de la plataforma, está activo y el monto cumple
//     el mínimo.
//  4. La firma del usuario (payer) es criptográficamente válida.
//  5. Anti-replay + reserva de gasto diario según el fee REAL de la tx.
export async function validateSignedTransaction(
  connection: Connection,
  tx: Transaction,
  relayerPubkey: PublicKey,
): Promise<ValidatedPayment> {
  if (!tx.feePayer?.equals(relayerPubkey)) {
    throw new Error("El fee payer no es el relayer");
  }

  const payIxs = tx.instructions.filter((ix) => ix.programId.equals(PROGRAM_ID));
  const computeBudgetIxs = tx.instructions.filter((ix) =>
    ix.programId.equals(ComputeBudgetProgram.programId),
  );
  const otherIxs = tx.instructions.filter(
    (ix) =>
      !ix.programId.equals(PROGRAM_ID) &&
      !ix.programId.equals(ComputeBudgetProgram.programId),
  );
  if (otherIxs.length > 0) {
    throw new Error("La transacción contiene instrucciones no permitidas");
  }
  if (payIxs.length !== 1) {
    throw new Error("Se espera exactamente una instrucción del programa latamlink_pay");
  }

  const { units, microLamports } = inspectComputeBudget(computeBudgetIxs);

  const payIx = payIxs[0]!;
  if (!Buffer.from(payIx.data.subarray(0, 8)).equals(PAY_DISCRIMINATOR)) {
    throw new Error("La instrucción del programa no es `pay`");
  }
  if (payIx.data.length !== 16) {
    throw new Error("Datos de instrucción `pay` malformados");
  }

  for (const ix of tx.instructions) {
    if (ix.keys.some((k) => k.pubkey.equals(relayerPubkey))) {
      throw new Error("El relayer no puede aparecer como cuenta de una instrucción");
    }
  }

  const payer = payIx.keys[0]?.pubkey;
  const merchantKey = payIx.keys[2]?.pubkey;
  if (!payer || !merchantKey) throw new Error("Cuentas de `pay` incompletas");
  if (payer.equals(relayerPubkey)) {
    throw new Error("El payer no puede ser el relayer");
  }

  const payerSig = tx.signatures.find((s) => s.publicKey.equals(payer));
  if (!payerSig?.signature) {
    throw new Error("Falta la firma del usuario (payer)");
  }
  // Verificación criptográfica real: sin esto, 64 bytes de basura pasaban por
  // firma y consumían el presupuesto diario antes de que el envío fallara.
  if (!tx.verifySignatures(false)) {
    throw new Error("La firma del usuario no es válida");
  }

  const amount = Buffer.from(payIx.data).readBigUInt64LE(8);
  const merchantInfo = await connection.getAccountInfo(merchantKey);
  if (!merchantInfo || !merchantInfo.owner.equals(PROGRAM_ID)) {
    throw new Error("Merchant inválido");
  }
  const merchant = decodeMerchant(merchantKey, merchantInfo.data);
  if (!merchant.owner.equals(platformOwnerPubkey())) {
    throw new Error("El comercio no pertenece a la plataforma");
  }
  if (!merchant.isActive) throw new Error("El comercio está inactivo");
  if (amount < merchant.minPaymentAmount) {
    throw new Error("Monto menor al mínimo del comercio");
  }

  // El anti-replay se reserva antes de cualquier await posterior para que dos
  // envíos simultáneos de la misma transacción no pasen los dos.
  const now = Date.now();
  const replayKey = payerSig.signature.toString("base64");
  const seenUntil = seenSignatures.get(replayKey);
  if (seenUntil !== undefined && seenUntil > now) {
    throw new Error("Transacción ya procesada (replay)");
  }
  if (seenSignatures.size > MAX_REPLAY_ENTRIES) purgeExpired(now);
  seenSignatures.set(replayKey, now + REPLAY_TTL_MS);

  // Fee real de la transacción, no una constante: firmas + fee de prioridad.
  const priorityLamports = Math.ceil((units * microLamports) / 1_000_000);
  const reservedLamports = LAMPORTS_PER_SIGNATURE * tx.signatures.length + priorityLamports;

  try {
    reserveDailySpend(reservedLamports);
  } catch (err) {
    seenSignatures.delete(replayKey);
    throw err;
  }

  return { payer, merchant: merchantKey, amount, replayKey, reservedLamports };
}
