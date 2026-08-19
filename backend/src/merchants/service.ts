import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { randomBytes } from "node:crypto";
import { MAX_DESTINATIONS } from "../solana/constants.js";
import {
  deriveGasVaultPda,
  deriveMerchantPda,
  deriveVaultPda,
  fetchMerchant,
} from "../solana/merchant.js";
import {
  buildInitializeMerchantInstruction,
  buildUpdateConfigInstruction,
} from "../solana/instructions.js";

const INIT_COMPUTE_UNIT_LIMIT = 400_000;
const MAX_TERMINAL_ID_LEN = 32;

export interface CreateMerchantParams {
  paymentTokenMint: string;
  destinations: string[]; // token accounts, mismo mint
  percentages: number[]; // deben sumar 100
  posTerminalId: string;
  feeBps: number; // comisión de gas de la plataforma
  posFeeBps: number; // comisión POS de la plataforma
  minPaymentAmount: string;
}

export interface CreateMerchantResult {
  merchant: string;
  merchantId: string;
  owner: string;
  vault: string;
  gasVault: string;
  signature: string;
}

// MODELO DE NEGOCIO (decisión del humano, 2026-08-18): el merchant se crea
// SIEMPRE con owner = wallet de la plataforma. El contrato solo permite
// retirar el gas_vault al owner y hacia una cuenta del owner, así que este es
// el único diseño en el que las comisiones (fee_bps + pos_fee_bps) son
// exclusivamente nuestras. Efecto secundario deseado: el comercio nunca firma
// nada on-chain ni necesita SOL — la plataforma paga la renta del alta.
export async function createMerchant(
  connection: Connection,
  platformOwner: Keypair,
  params: CreateMerchantParams,
): Promise<CreateMerchantResult> {
  const { destinations, percentages } = params;

  if (destinations.length === 0 || destinations.length > MAX_DESTINATIONS) {
    throw new Error(`destinations debe tener entre 1 y ${MAX_DESTINATIONS} cuentas`);
  }
  if (destinations.length !== percentages.length) {
    throw new Error("destinations y percentages deben tener la misma longitud");
  }
  if (percentages.some((p) => !Number.isInteger(p) || p < 0 || p > 100)) {
    throw new Error("Cada porcentaje debe ser un entero entre 0 y 100");
  }
  if (percentages.reduce((a, b) => a + b, 0) !== 100) {
    throw new Error("Los porcentajes deben sumar exactamente 100");
  }
  if (new Set(destinations).size !== destinations.length) {
    throw new Error("Hay cuentas destino duplicadas");
  }
  // El contrato mide el límite en BYTES, no en caracteres: "ñ".repeat(32)
  // pasaba la validación local y revertía on-chain quemando la fee.
  const terminalBytes = Buffer.byteLength(params.posTerminalId, "utf8");
  if (terminalBytes === 0 || terminalBytes > MAX_TERMINAL_ID_LEN) {
    throw new Error(`posTerminalId debe ocupar entre 1 y ${MAX_TERMINAL_ID_LEN} bytes`);
  }
  for (const [label, bps] of [["feeBps", params.feeBps], ["posFeeBps", params.posFeeBps]] as const) {
    if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
      throw new Error(`${label} debe ser un entero entre 0 y 10000`);
    }
  }
  const minPaymentAmount = BigInt(params.minPaymentAmount);
  if (minPaymentAmount <= 0n) throw new Error("minPaymentAmount debe ser mayor que 0");

  const mint = new PublicKey(params.paymentTokenMint);
  const destinationKeys = destinations.map((d) => new PublicKey(d));

  // Pre-validación off-chain: el contrato exige que cada destino sea una token
  // account del mismo mint. Fallar aquí da un error claro en vez de un revert.
  // Aleatorio de 64 bits: con Date.now() dos altas en el mismo milisegundo
  // derivaban la misma PDA y la segunda revertía tras todo el trabajo de RPC.
  const merchantId = randomBytes(8).readBigUInt64LE(0);
  const merchantPda = deriveMerchantPda(platformOwner.publicKey, merchantId);
  const vault = deriveVaultPda(merchantPda);
  const gasVault = deriveGasVaultPda(merchantPda);

  for (const dest of destinationKeys) {
    if (dest.equals(vault) || dest.equals(gasVault)) {
      throw new Error(`El destino ${dest.toBase58()} no puede ser el vault ni el gas_vault`);
    }
    const info = await connection.getParsedAccountInfo(dest);
    const parsed = info.value?.data;
    if (!parsed || !("parsed" in parsed)) {
      throw new Error(`El destino ${dest.toBase58()} no es una cuenta de token válida`);
    }
    const destMint = parsed.parsed?.info?.mint as string | undefined;
    if (destMint !== mint.toBase58()) {
      throw new Error(
        `El destino ${dest.toBase58()} es del mint ${destMint ?? "desconocido"}, se esperaba ${mint.toBase58()}`,
      );
    }
  }

  if (await connection.getAccountInfo(merchantPda)) {
    throw new Error(`Ya existe un comercio con merchantId ${merchantId}`);
  }

  const ix = buildInitializeMerchantInstruction({
    owner: platformOwner.publicKey,
    paymentTokenMint: mint,
    merchantId,
    feeBps: params.feeBps,
    posFeeBps: params.posFeeBps,
    minPaymentAmount,
    destinations: destinationKeys,
    percentages,
    posTerminalId: params.posTerminalId,
  });

  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: INIT_COMPUTE_UNIT_LIMIT }),
    ix,
  );
  const signature = await sendAndConfirmTransaction(connection, tx, [platformOwner]);

  return {
    merchant: merchantPda.toBase58(),
    merchantId: merchantId.toString(),
    owner: platformOwner.publicKey.toBase58(),
    vault: vault.toBase58(),
    gasVault: gasVault.toBase58(),
    signature,
  };
}

export interface UpdateMerchantParams {
  destinations: string[];
  percentages: number[];
  feeBps: number;
  posFeeBps: number;
  minPaymentAmount: string;
}

// Actualiza la configuración de un comercio existente.
//
// Firma la plataforma, que es el `owner` on-chain. El comerciante no firma ni
// necesita SOL: la app solo manda los valores nuevos.
export async function updateMerchantConfig(
  connection: Connection,
  platformOwner: Keypair,
  merchantAddress: string,
  params: UpdateMerchantParams,
): Promise<{ merchant: string; signature: string }> {
  const { destinations, percentages } = params;

  if (destinations.length === 0 || destinations.length > MAX_DESTINATIONS) {
    throw new Error(`destinations debe tener entre 1 y ${MAX_DESTINATIONS} cuentas`);
  }
  if (destinations.length !== percentages.length) {
    throw new Error("destinations y percentages deben tener la misma longitud");
  }
  if (percentages.some((p) => !Number.isInteger(p) || p < 0 || p > 100)) {
    throw new Error("Cada porcentaje debe ser un entero entre 0 y 100");
  }
  if (percentages.reduce((a, b) => a + b, 0) !== 100) {
    throw new Error("Los porcentajes deben sumar exactamente 100");
  }
  if (new Set(destinations).size !== destinations.length) {
    throw new Error("Hay cuentas destino duplicadas");
  }
  for (const [label, bps] of [["feeBps", params.feeBps], ["posFeeBps", params.posFeeBps]] as const) {
    if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
      throw new Error(`${label} debe ser un entero entre 0 y 10000`);
    }
  }
  const minPaymentAmount = BigInt(params.minPaymentAmount);
  if (minPaymentAmount <= 0n) throw new Error("minPaymentAmount debe ser mayor que 0");

  const merchantPda = new PublicKey(merchantAddress);
  const merchant = await fetchMerchant(connection, merchantPda);
  if (!merchant.owner.equals(platformOwner.publicKey)) {
    throw new Error("El comercio no pertenece a la plataforma");
  }

  const vault = deriveVaultPda(merchantPda);
  const gasVault = deriveGasVaultPda(merchantPda);
  const destinationKeys = destinations.map((d) => new PublicKey(d));

  // Mismas comprobaciones que en el alta: el contrato exige cuentas de token
  // del mismo mint, y fallar aquí da un error claro en vez de un revert.
  for (const dest of destinationKeys) {
    if (dest.equals(vault) || dest.equals(gasVault)) {
      throw new Error(`El destino ${dest.toBase58()} no puede ser el vault ni el gas_vault`);
    }
    const info = await connection.getParsedAccountInfo(dest);
    const parsed = info.value?.data;
    if (!parsed || !("parsed" in parsed)) {
      throw new Error(`El destino ${dest.toBase58()} no es una cuenta de token válida`);
    }
    const destMint = parsed.parsed?.info?.mint as string | undefined;
    if (destMint !== merchant.paymentTokenMint.toBase58()) {
      throw new Error(
        `El destino ${dest.toBase58()} es del mint ${destMint ?? "desconocido"}, se esperaba ${merchant.paymentTokenMint.toBase58()}`,
      );
    }
  }

  const ix = buildUpdateConfigInstruction({
    owner: platformOwner.publicKey,
    merchant: merchantPda,
    destinations: destinationKeys,
    percentages,
    feeBps: params.feeBps,
    posFeeBps: params.posFeeBps,
    minPaymentAmount,
  });

  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: INIT_COMPUTE_UNIT_LIMIT }),
    ix,
  );
  const signature = await sendAndConfirmTransaction(connection, tx, [platformOwner]);

  return { merchant: merchantAddress, signature };
}
