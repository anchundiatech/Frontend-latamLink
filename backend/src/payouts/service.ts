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
import { fetchMerchant } from "../solana/merchant.js";
import { platformOwnerPubkey } from "../config.js";

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
  merchantPda: string;
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
  platformFee: string;
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

  // La comisión de la plataforma se cobra acá, al retirar, en vez de en cada
  // cobro: así el cliente que escanea el QR recibe el 100% sin pasar por el
  // contrato. Las tasas se leen de la cuenta on-chain del comercio, nunca de
  // lo que mande el navegador.
  const merchant = await fetchMerchant(connection, new PublicKey(params.merchantPda));
  const bps = BigInt(merchant.feeBps + merchant.posFeeBps);
  // Redondeo hacia arriba para la comisión (y hacia abajo para lo que recibe
  // el comercio): el remanente de la división nunca queda a favor del
  // comercio, se lo queda la plataforma, igual que el "dust" en un cobro
  // normal por el contrato.
  const platformFee = bps > 0n ? (params.amount * bps + 9_999n) / 10_000n : 0n;
  const montoNeto = params.amount - platformFee;

  const platformOwner = platformOwnerPubkey();
  const platformAta = getAssociatedTokenAddressSync(mint, platformOwner);
  const platformAtaExiste = platformFee > 0n ? Boolean(await connection.getAccountInfo(platformAta)) : true;

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
    createTransferCheckedInstruction(source, mint, destino.cuenta, owner, montoNeto, params.decimals),
  );

  if (platformFee > 0n) {
    if (!platformAtaExiste) {
      instrucciones.push(
        createAssociatedTokenAccountInstruction(relayerPubkey, platformAta, platformOwner, mint),
      );
    }
    instrucciones.push(
      createTransferCheckedInstruction(source, mint, platformAta, owner, platformFee, params.decimals),
    );
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: relayerPubkey, blockhash, lastValidBlockHeight });
  tx.add(...instrucciones);

  return {
    transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    blockhash,
    lastValidBlockHeight,
    source: source.toBase58(),
    destination: destino.cuenta.toBase58(),
    amount: montoNeto.toString(),
    platformFee: platformFee.toString(),
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

  // Una transferencia (al destino que eligió el comercio) o dos (esa más la
  // comisión de la plataforma, descontada acá en vez de en cada cobro).
  const transferencias = tx.instructions.filter((ix) => ix.programId.equals(TOKEN_PROGRAM_ID));
  if (transferencias.length !== 1 && transferencias.length !== 2) {
    throw new Error("Se esperaba una transferencia, o dos si incluye la comisión de la plataforma");
  }
  if (transferencias.some((ix) => ix.data[0] !== TRANSFER_CHECKED)) {
    throw new Error("Solo se permiten transferencias verificadas");
  }

  // El dueño de la cuenta de origen es el cuarto índice de transferChecked
  // (source, mint, destination, owner) y tiene que ser quien firma: nadie
  // puede mover el dinero de otro. Las dos transferencias, si hay dos, tienen
  // que salir de la misma cuenta — si no, alguien coló un drenaje aparte
  // disfrazado de comisión.
  const [principal, comision] = transferencias;
  const dueño = principal!.keys[3]?.pubkey;
  const fuente = principal!.keys[0]?.pubkey;
  if (!dueño || !fuente) throw new Error("Transferencia incompleta");
  if (dueño.equals(relayer.publicKey)) {
    throw new Error("El relayer no puede ser el origen de un retiro");
  }

  if (comision) {
    if (!comision.keys[0]?.pubkey.equals(fuente) || !comision.keys[3]?.pubkey.equals(dueño)) {
      throw new Error("La comisión debe salir de la misma cuenta que el retiro");
    }
    const mint = comision.keys[1]?.pubkey;
    const destinoComision = comision.keys[2]?.pubkey;
    if (!mint || !destinoComision) throw new Error("Transferencia de comisión incompleta");
    const ataPlataformaEsperada = getAssociatedTokenAddressSync(mint, platformOwnerPubkey());
    if (!destinoComision.equals(ataPlataformaEsperada)) {
      throw new Error("La comisión no puede ir a otra cuenta que no sea la de la plataforma");
    }
  }

  const creaciones = tx.instructions.filter((ix) =>
    ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID),
  );
  if (creaciones.length > 2) {
    throw new Error("Solo se permite crear la cuenta de destino y la de la plataforma");
  }

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
  const lamports = 5_000 * tx.signatures.length + creaciones.length * RENTA_CUENTA_TOKEN;
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
