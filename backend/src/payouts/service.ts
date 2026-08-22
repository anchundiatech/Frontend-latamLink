import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { releaseLamports, reserveLamports } from "../relayer/validate.js";

/**
 * Retiro desde la cuenta de pago del comerciante.
 *
 * Los cobros caen en la cuenta que Privy le creó al entrar con Google, pero esa
 * cuenta no tiene SOL: sin un pagador de fee, el comerciante no puede mover su
 * propio dinero. Aquí el relayer paga la red y el comerciante firma —es su
 * plata, la autorización tiene que ser suya— igual que en un cobro.
 */
const PAYOUT_COMPUTE_UNIT_LIMIT = 60_000;
// Renta aproximada de crear una cuenta de token para el destinatario.
const RENTA_CUENTA_TOKEN = 2_039_280;

export interface BuildPayoutParams {
  ownerPubkey: string;
  mint: string;
  destination: string;
  amount: bigint;
  decimals: number;
}

export interface BuildPayoutResult {
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
  source: string;
  destination: string;
  amount: string;
  creaCuentaDestino: boolean;
}

async function resolverDestino(
  connection: Connection,
  mint: PublicKey,
  destination: string,
): Promise<{ cuenta: PublicKey; dueño: PublicKey; hayQueCrearla: boolean }> {
  const key = new PublicKey(destination);
  const info = await connection.getParsedAccountInfo(key);

  if (info.value && info.value.owner.equals(TOKEN_PROGRAM_ID)) {
    const data = info.value.data;
    const mintDelDestino =
      typeof data === "object" && "parsed" in data
        ? (data.parsed?.info?.mint as string | undefined)
        : undefined;
    if (mintDelDestino !== mint.toBase58()) {
      throw new Error("Esa cuenta recibe otro token distinto al de tus cobros");
    }
    return { cuenta: key, dueño: key, hayQueCrearla: false };
  }

  const asociada = getAssociatedTokenAddressSync(mint, key);
  const existe = Boolean(await connection.getAccountInfo(asociada));
  return { cuenta: asociada, dueño: key, hayQueCrearla: !existe };
}

export async function buildPayoutTransaction(
  connection: Connection,
  relayerPubkey: PublicKey,
  params: BuildPayoutParams,
): Promise<BuildPayoutResult> {
  if (params.amount <= 0n) throw new Error("El monto debe ser mayor que cero");

  const owner = new PublicKey(params.ownerPubkey);
  const mint = new PublicKey(params.mint);
  const source = getAssociatedTokenAddressSync(mint, owner);

  const saldo = await connection.getTokenAccountBalance(source).catch(() => null);
  if (!saldo) throw new Error("Todavía no recibiste cobros en esta cuenta");
  if (BigInt(saldo.value.amount) < params.amount) {
    throw new Error(`Saldo insuficiente: tenés ${saldo.value.uiAmountString}`);
  }

  const destino = await resolverDestino(connection, mint, params.destination);
  if (destino.cuenta.equals(source)) {
    throw new Error("El destino no puede ser tu propia cuenta");
  }

  const instrucciones: TransactionInstruction[] = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: PAYOUT_COMPUTE_UNIT_LIMIT }),
  ];

  if (destino.hayQueCrearla) {
    // La renta la adelanta la plataforma; se descuenta del presupuesto diario
    // para que no sea un gasto sin techo.
    instrucciones.push(
      createAssociatedTokenAccountInstruction(relayerPubkey, destino.cuenta, destino.dueño, mint),
    );
  }

  instrucciones.push(
    createTransferCheckedInstruction(source, mint, destino.cuenta, owner, params.amount, params.decimals),
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: relayerPubkey, blockhash, lastValidBlockHeight });
  tx.add(...instrucciones);

  return {
    transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    blockhash,
    lastValidBlockHeight,
    source: source.toBase58(),
    destination: destino.cuenta.toBase58(),
    amount: params.amount.toString(),
    creaCuentaDestino: destino.hayQueCrearla,
  };
}

const TRANSFER_CHECKED = 12; // discriminador de la instrucción del Token Program

export async function submitPayoutTransaction(
  connection: Connection,
  relayer: Keypair,
  transactionBase64: string,
): Promise<{ signature: string }> {
  const tx = Transaction.from(Buffer.from(transactionBase64, "base64"));

  if (!tx.feePayer?.equals(relayer.publicKey)) {
    throw new Error("El fee payer no es el relayer");
  }

  // Whitelist: solo lo que este mismo backend arma para un retiro.
  const permitidos = [
    ComputeBudgetProgram.programId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
  ];
  if (tx.instructions.some((ix) => !permitidos.some((p) => ix.programId.equals(p)))) {
    throw new Error("La transacción contiene instrucciones no permitidas");
  }

  const transferencias = tx.instructions.filter((ix) => ix.programId.equals(TOKEN_PROGRAM_ID));
  if (transferencias.length !== 1) {
    throw new Error("Se espera exactamente una transferencia");
  }
  const transferencia = transferencias[0]!;
  if (transferencia.data[0] !== TRANSFER_CHECKED) {
    throw new Error("Solo se permite una transferencia verificada");
  }

  // El dueño de la cuenta de origen es el tercer índice de transferChecked y
  // tiene que ser quien firma: nadie puede mover el dinero de otro.
  const dueño = transferencia.keys[3]?.pubkey;
  if (!dueño) throw new Error("Transferencia incompleta");
  if (dueño.equals(relayer.publicKey)) {
    throw new Error("El relayer no puede ser el origen de un retiro");
  }

  const creaciones = tx.instructions.filter((ix) =>
    ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID),
  );
  if (creaciones.length > 1) throw new Error("Solo se permite crear una cuenta de destino");

  // El relayer solo puede aparecer pagando la renta de esa creación.
  for (const ix of tx.instructions) {
    if (ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) continue;
    if (ix.keys.some((k) => k.pubkey.equals(relayer.publicKey))) {
      throw new Error("El relayer no puede aparecer como cuenta de una instrucción");
    }
  }

  const firma = tx.signatures.find((s) => s.publicKey.equals(dueño));
  if (!firma?.signature) throw new Error("Falta tu firma para autorizar el retiro");
  if (!tx.verifySignatures(false)) throw new Error("La firma no es válida");

  // Se reserva lo que realmente cuesta: las firmas y, si hace falta, la renta
  // de la cuenta de destino. Así el retiro entra en el mismo techo diario que
  // protege al relayer.
  const lamports =
    5_000 * tx.signatures.length + (creaciones.length > 0 ? RENTA_CUENTA_TOKEN : 0);
  reserveLamports(lamports);

  try {
    tx.partialSign(relayer);
    const signature = await connection.sendRawTransaction(tx.serialize(), { maxRetries: 3 });
    return { signature };
  } catch (err) {
    releaseLamports(lamports);
    throw err;
  }
}
