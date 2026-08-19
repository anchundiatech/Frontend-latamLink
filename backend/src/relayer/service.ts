import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PAY_COMPUTE_UNIT_LIMIT } from "../solana/constants.js";
import { fetchMerchant } from "../solana/merchant.js";
import { buildPayInstruction } from "../solana/instructions.js";
import { rollbackReservation, validateSignedTransaction } from "./validate.js";

export interface BuildPayResult {
  transaction: string; // base64, sin firmas
  blockhash: string;
  lastValidBlockHeight: number;
  amount: string;
  merchant: string;
}

// Paso "build": arma la tx pay con fee_payer = relayer y payer = wallet del
// usuario (Privy). Se devuelve serializada para que el usuario firme SU parte.
export async function buildPayTransaction(
  connection: Connection,
  relayerPubkey: PublicKey,
  params: { merchantAddress: string; payerPubkey: string; amount: bigint },
): Promise<BuildPayResult> {
  const merchant = await fetchMerchant(
    connection,
    new PublicKey(params.merchantAddress),
  );

  // Pre-validación off-chain: no quemar fees en txs que van a revertir.
  if (!merchant.isActive) throw new Error("El comercio está inactivo");
  if (params.amount < merchant.minPaymentAmount) {
    throw new Error(
      `Monto ${params.amount} menor al mínimo ${merchant.minPaymentAmount}`,
    );
  }

  const payer = new PublicKey(params.payerPubkey);
  const payerTokenAccount = getAssociatedTokenAddressSync(
    merchant.paymentTokenMint,
    payer,
  );
  const posFeeDestination = getAssociatedTokenAddressSync(
    merchant.paymentTokenMint,
    merchant.owner,
  );

  for (const [label, account] of [
    ["ATA del pagador", payerTokenAccount],
    ["pos_fee_destination", posFeeDestination],
  ] as const) {
    const info = await connection.getAccountInfo(account);
    if (!info) throw new Error(`${label} no existe: ${account.toBase58()}`);
  }

  const payIx = buildPayInstruction({
    payer,
    payerTokenAccount,
    merchant,
    posFeeDestination,
    amount: params.amount,
  });

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({ feePayer: relayerPubkey, blockhash, lastValidBlockHeight });
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: PAY_COMPUTE_UNIT_LIMIT }),
    payIx,
  );

  return {
    transaction: tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64"),
    blockhash,
    lastValidBlockHeight,
    amount: params.amount.toString(),
    merchant: merchant.address.toBase58(),
  };
}

export interface SubmitResult {
  signature: string;
  slot: number;
  merchant: string;
  payer: string;
  amount: string;
}

export interface SubmittedInfo {
  signature: string;
  merchant: string;
  payer: string;
  amount: string;
}

// La transacción ya está en la red: puede confirmarse después del timeout.
// Se distingue de un fallo para que el cliente consulte en vez de volver a
// cobrar — reintentar a ciegas es cobrarle dos veces al usuario.
export class ConfirmationTimeoutError extends Error {
  constructor(readonly submitted: SubmittedInfo) {
    super(
      `La transacción ${submitted.signature} fue enviada pero no se confirmó a tiempo. ` +
        `Consultá su estado antes de reintentar.`,
    );
    this.name = "ConfirmationTimeoutError";
  }
}

// Paso "submit": valida la tx parcialmente firmada por el usuario, firma como
// fee_payer y la envía. Las validaciones anti-abuso son CRÍTICAS: el relayer
// está regalando SOL.
export async function submitSignedTransaction(
  connection: Connection,
  relayer: Keypair,
  transactionBase64: string,
  onSubmitted?: (info: SubmittedInfo) => void,
): Promise<SubmitResult> {
  const tx = Transaction.from(Buffer.from(transactionBase64, "base64"));

  const validated = await validateSignedTransaction(connection, tx, relayer.publicKey);

  let signature: string;
  try {
    tx.partialSign(relayer);
    if (!tx.verifySignatures()) {
      throw new Error("Firmas inválidas en la transacción");
    }
    signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });
  } catch (err) {
    // No se gastó nada: devolvemos el presupuesto y liberamos el anti-replay.
    rollbackReservation(validated);
    throw err;
  }

  const submitted: SubmittedInfo = {
    signature,
    merchant: validated.merchant.toBase58(),
    payer: validated.payer.toBase58(),
    amount: validated.amount.toString(),
  };
  onSubmitted?.(submitted);

  let confirmed: number;
  try {
    confirmed = await pollConfirmation(connection, signature, 60_000);
  } catch (err) {
    if (err instanceof TimeoutError) throw new ConfirmationTimeoutError(submitted);
    throw err;
  }

  return { ...submitted, slot: confirmed };
}

class TimeoutError extends Error {}

async function pollConfirmation(
  connection: Connection,
  signature: string,
  timeoutMs: number,
): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = (await connection.getSignatureStatuses([signature])).value[0];
    if (status?.err) {
      throw new Error(`Transacción falló on-chain: ${JSON.stringify(status.err)}`);
    }
    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    ) {
      return status.slot;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new TimeoutError(`Timeout esperando confirmación de ${signature}`);
}
