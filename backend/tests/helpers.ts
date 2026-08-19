import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { PAY_DISCRIMINATOR, PROGRAM_ID } from "../src/solana/constants.js";

// Codifica una cuenta Merchant con el layout exacto que espera decodeMerchant
// (ver src/solana/merchant.ts y contract/lib.rs).
export function encodeMerchant(params: {
  owner: PublicKey;
  mint: PublicKey;
  merchantId: bigint;
  posTerminalId: string;
  destinations: PublicKey[];
  percentages: number[];
  feeBps: number;
  posFeeBps: number;
  minPaymentAmount: bigint;
  isActive: boolean;
}): Buffer {
  const terminal = Buffer.from(params.posTerminalId, "utf8");
  const size =
    8 + 32 + 32 + 8 + 4 + terminal.length + 4 + params.destinations.length * 32 +
    4 + params.percentages.length + 2 + 2 + 8 + 1 + 1 + 8 + 8;
  const data = Buffer.alloc(size);
  let o = 0;
  data.write("MERCHANT", o, "utf8"); // discriminador: irrelevante para el decoder
  o += 8;
  params.owner.toBuffer().copy(data, o);
  o += 32;
  params.mint.toBuffer().copy(data, o);
  o += 32;
  data.writeBigUInt64LE(params.merchantId, o);
  o += 8;
  data.writeUInt32LE(terminal.length, o);
  o += 4;
  terminal.copy(data, o);
  o += terminal.length;
  data.writeUInt32LE(params.destinations.length, o);
  o += 4;
  for (const d of params.destinations) {
    d.toBuffer().copy(data, o);
    o += 32;
  }
  data.writeUInt32LE(params.percentages.length, o);
  o += 4;
  for (const p of params.percentages) {
    data.writeUInt8(p, o);
    o += 1;
  }
  data.writeUInt16LE(params.feeBps, o);
  o += 2;
  data.writeUInt16LE(params.posFeeBps, o);
  o += 2;
  data.writeBigUInt64LE(params.minPaymentAmount, o);
  o += 8;
  data.writeUInt8(255, o); // bump
  o += 1;
  data.writeUInt8(params.isActive ? 1 : 0, o);
  o += 1;
  data.writeBigUInt64LE(0n, o); // total_payments_received
  o += 8;
  data.writeBigUInt64LE(0n, o); // total_volume
  return data;
}

// Connection falsa: validate.ts solo consulta getAccountInfo del merchant.
export function fakeConnection(
  accounts: Map<string, { data: Buffer; owner: PublicKey }>,
): Connection {
  return {
    getAccountInfo: async (key: PublicKey) => {
      const found = accounts.get(key.toBase58());
      return found
        ? { data: found.data, owner: found.owner, executable: false, lamports: 1, rentEpoch: 0 }
        : null;
    },
  } as unknown as Connection;
}

export interface PayTxOptions {
  payer: Keypair;
  merchant: PublicKey;
  relayer: PublicKey;
  amount: bigint;
  feePayer?: PublicKey;
  discriminator?: Buffer;
  dataLength?: number;
  extraKeys?: PublicKey[];
  extraInstruction?: TransactionInstruction;
  duplicatePayIx?: boolean;
  skipPayerSignature?: boolean;
  forgeSignature?: boolean;
  computeBudgetIxs?: TransactionInstruction[];
}

// Arma una tx `pay` como la produciría /payments/build y la firma como el
// usuario. Hace round-trip por serialize/deserialize igual que el flujo real.
export function buildPayTx(options: PayTxOptions): Transaction {
  const data = Buffer.alloc(options.dataLength ?? 16);
  (options.discriminator ?? PAY_DISCRIMINATOR).copy(data, 0);
  if ((options.dataLength ?? 16) >= 16) data.writeBigUInt64LE(options.amount, 8);

  const keys = [
    { pubkey: options.payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: true }, // ATA
    { pubkey: options.merchant, isSigner: false, isWritable: true },
    ...(options.extraKeys ?? []).map((k) => ({
      pubkey: k,
      isSigner: false,
      isWritable: false,
    })),
  ];

  const payIx = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });

  const tx = new Transaction({
    feePayer: options.feePayer ?? options.relayer,
    blockhash: Keypair.generate().publicKey.toBase58(),
    lastValidBlockHeight: 1_000_000,
  });
  const computeBudgetIxs = options.computeBudgetIxs ?? [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
  ];
  tx.add(...computeBudgetIxs, payIx);
  if (options.duplicatePayIx) tx.add(payIx);
  if (options.extraInstruction) tx.add(options.extraInstruction);

  if (options.forgeSignature) {
    // 64 bytes que parecen una firma pero no lo son.
    tx.addSignature(options.payer.publicKey, Buffer.alloc(64, 7));
  } else if (!options.skipPayerSignature) {
    tx.partialSign(options.payer);
  }

  return Transaction.from(
    tx.serialize({ requireAllSignatures: false, verifySignatures: false }),
  );
}

export function transferInstruction(from: PublicKey, to: PublicKey): TransactionInstruction {
  return SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: 1 });
}
