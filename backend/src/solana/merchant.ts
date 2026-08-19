import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants.js";

export interface MerchantState {
  address: PublicKey;
  owner: PublicKey;
  paymentTokenMint: PublicKey;
  merchantId: bigint;
  posTerminalId: string;
  destinations: PublicKey[];
  percentages: number[];
  feeBps: number;
  posFeeBps: number;
  minPaymentAmount: bigint;
  bump: number;
  isActive: boolean;
  totalPaymentsReceived: bigint;
  totalVolume: bigint;
}

export function deriveMerchantPda(owner: PublicKey, merchantId: bigint): PublicKey {
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(merchantId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("merchant"), owner.toBuffer(), idBuf],
    PROGRAM_ID,
  )[0];
}

export function deriveVaultPda(merchant: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), merchant.toBuffer()],
    PROGRAM_ID,
  )[0];
}

export function deriveGasVaultPda(merchant: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("gas_vault"), merchant.toBuffer()],
    PROGRAM_ID,
  )[0];
}

// Layout Borsh de la cuenta Merchant (ver LATAMLINKPAY/lib.rs):
// disc(8) | owner(32) | mint(32) | merchant_id(u64) | pos_terminal_id(string)
// | destinations(vec<pubkey>) | percentages(vec<u8>) | fee_bps(u16)
// | pos_fee_bps(u16) | min_payment_amount(u64) | bump(u8) | is_active(bool)
// | total_payments_received(u64) | total_volume(u64)
export function decodeMerchant(address: PublicKey, data: Buffer): MerchantState {
  // Lecturas acotadas: un dato corrupto debe dar un error de dominio claro y
  // no un RangeError a mitad del decodificado.
  const need = (offset: number, bytes: number): void => {
    if (offset + bytes > data.length) {
      throw new Error(`Cuenta de comercio truncada o corrupta: ${address.toBase58()}`);
    }
  };

  let o = 8;
  need(o, 72);
  const owner = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const paymentTokenMint = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const merchantId = data.readBigUInt64LE(o);
  o += 8;
  need(o, 4);
  const terminalLen = data.readUInt32LE(o);
  o += 4;
  need(o, terminalLen);
  const posTerminalId = data.subarray(o, o + terminalLen).toString("utf8");
  o += terminalLen;
  need(o, 4);
  const destCount = data.readUInt32LE(o);
  o += 4;
  need(o, destCount * 32);
  const destinations: PublicKey[] = [];
  for (let i = 0; i < destCount; i++) {
    destinations.push(new PublicKey(data.subarray(o, o + 32)));
    o += 32;
  }
  need(o, 4);
  const pctCount = data.readUInt32LE(o);
  o += 4;
  need(o, pctCount);
  const percentages: number[] = [];
  for (let i = 0; i < pctCount; i++) {
    percentages.push(data.readUInt8(o));
    o += 1;
  }
  need(o, 22);
  const feeBps = data.readUInt16LE(o);
  o += 2;
  const posFeeBps = data.readUInt16LE(o);
  o += 2;
  const minPaymentAmount = data.readBigUInt64LE(o);
  o += 8;
  const bump = data.readUInt8(o);
  o += 1;
  const isActive = data.readUInt8(o) === 1;
  o += 1;
  const totalPaymentsReceived = data.readBigUInt64LE(o);
  o += 8;
  const totalVolume = data.readBigUInt64LE(o);

  return {
    address,
    owner,
    paymentTokenMint,
    merchantId,
    posTerminalId,
    destinations,
    percentages,
    feeBps,
    posFeeBps,
    minPaymentAmount,
    bump,
    isActive,
    totalPaymentsReceived,
    totalVolume,
  };
}

export async function fetchMerchant(
  connection: Connection,
  address: PublicKey,
): Promise<MerchantState> {
  const info = await connection.getAccountInfo(address);
  if (!info) throw new Error(`Merchant no encontrado: ${address.toBase58()}`);
  if (!info.owner.equals(PROGRAM_ID)) {
    throw new Error(`La cuenta ${address.toBase58()} no pertenece al programa latamlink_pay`);
  }
  return decodeMerchant(address, info.data);
}
