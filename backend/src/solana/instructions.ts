import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  INITIALIZE_MERCHANT_DISCRIMINATOR,
  MAX_DESTINATIONS,
  PAY_DISCRIMINATOR,
  PROGRAM_ID,
  WITHDRAW_GAS_FEES_DISCRIMINATOR,
} from "./constants.js";
import type { MerchantState } from "./merchant.js";
import { deriveGasVaultPda, deriveMerchantPda, deriveVaultPda } from "./merchant.js";

// El contrato exige SIEMPRE las 10 cuentas destino, en el orden exacto de
// merchant.destinations; los huecos se rellenan repitiendo la primera.
function padDestinations(destinations: PublicKey[]): PublicKey[] {
  if (destinations.length === 0 || destinations.length > MAX_DESTINATIONS) {
    throw new Error(`destinations debe tener entre 1 y ${MAX_DESTINATIONS} cuentas`);
  }
  const padded = [...destinations];
  while (padded.length < MAX_DESTINATIONS) padded.push(destinations[0]!);
  return padded;
}

export function buildPayInstruction(params: {
  payer: PublicKey;
  payerTokenAccount: PublicKey;
  merchant: MerchantState;
  posFeeDestination: PublicKey;
  amount: bigint;
  /**
   * Clave de referencia de Solana Pay. Se añade como cuenta extra de solo
   * lectura: Anchor la deja en `remaining_accounts` y el contrato la ignora,
   * pero queda indexada en la transacción, que es como los comercios
   * reconocen su cobro sin conocer la firma de antemano.
   */
  reference?: PublicKey;
}): TransactionInstruction {
  const { payer, payerTokenAccount, merchant, posFeeDestination, amount, reference } = params;
  const vault = deriveVaultPda(merchant.address);
  const gasVault = deriveGasVaultPda(merchant.address);
  const destinations = padDestinations(merchant.destinations);

  const data = Buffer.alloc(8 + 8);
  PAY_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(amount, 8);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: payerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: merchant.address, isSigner: false, isWritable: true },
      { pubkey: merchant.paymentTokenMint, isSigner: false, isWritable: false },
      { pubkey: posFeeDestination, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: gasVault, isSigner: false, isWritable: true },
      ...destinations.map((d) => ({ pubkey: d, isSigner: false, isWritable: true })),
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ...(reference ? [{ pubkey: reference, isSigner: false, isWritable: false }] : []),
    ],
    data,
  });
}

// Retiro del gas_vault (modelo de negocio): el contrato solo permite retirar
// al `owner` del merchant y hacia una token account DEL owner. Por eso los
// merchants se crean con owner = wallet de la plataforma — así las comisiones
// fee_bps (y la pos_fee) solo pueden fluir hacia nosotros.
export function buildWithdrawGasFeesInstruction(params: {
  owner: PublicKey;
  merchant: MerchantState;
  destination: PublicKey; // token account del owner, mismo mint
  amount: bigint;
}): TransactionInstruction {
  const { owner, merchant, destination, amount } = params;
  const gasVault = deriveGasVaultPda(merchant.address);

  const data = Buffer.alloc(8 + 8);
  WITHDRAW_GAS_FEES_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(amount, 8);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: merchant.address, isSigner: false, isWritable: false },
      { pubkey: gasVault, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildInitializeMerchantInstruction(params: {
  owner: PublicKey;
  paymentTokenMint: PublicKey;
  merchantId: bigint;
  feeBps: number;
  posFeeBps: number;
  minPaymentAmount: bigint;
  destinations: PublicKey[];
  percentages: number[];
  posTerminalId: string;
}): TransactionInstruction {
  const {
    owner,
    paymentTokenMint,
    merchantId,
    feeBps,
    posFeeBps,
    minPaymentAmount,
    destinations,
    percentages,
    posTerminalId,
  } = params;

  const merchant = deriveMerchantPda(owner, merchantId);
  const vault = deriveVaultPda(merchant);
  const gasVault = deriveGasVaultPda(merchant);
  const padded = padDestinations(destinations);

  const pctArray = Buffer.alloc(MAX_DESTINATIONS);
  percentages.forEach((p, i) => pctArray.writeUInt8(p, i));

  const terminalBytes = Buffer.from(posTerminalId, "utf8");
  // Args: merchant_id u64 | fee_bps u16 | pos_fee_bps u16 | min u64
  //       | destinations_count u8 | percentages [u8;10] | pos_terminal_id string
  const data = Buffer.alloc(8 + 8 + 2 + 2 + 8 + 1 + 10 + 4 + terminalBytes.length);
  let o = 0;
  INITIALIZE_MERCHANT_DISCRIMINATOR.copy(data, o);
  o += 8;
  data.writeBigUInt64LE(merchantId, o);
  o += 8;
  data.writeUInt16LE(feeBps, o);
  o += 2;
  data.writeUInt16LE(posFeeBps, o);
  o += 2;
  data.writeBigUInt64LE(minPaymentAmount, o);
  o += 8;
  data.writeUInt8(destinations.length, o);
  o += 1;
  pctArray.copy(data, o);
  o += 10;
  data.writeUInt32LE(terminalBytes.length, o);
  o += 4;
  terminalBytes.copy(data, o);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: merchant, isSigner: false, isWritable: true },
      { pubkey: paymentTokenMint, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: gasVault, isSigner: false, isWritable: true },
      ...padded.map((d) => ({ pubkey: d, isSigner: false, isWritable: true })),
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}
