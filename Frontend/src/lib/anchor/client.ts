import { PublicKey, SystemProgram, type Connection } from "@solana/web3.js"
import { type Provider, Program, type BN } from "@coral-xyz/anchor"
import { IDL } from "./idl"

export type MerchantAccount = {
  owner: PublicKey
  paymentTokenMint: PublicKey
  merchantId: BN
  posTerminalId: string
  destinations: PublicKey[]
  percentages: number[]
  feeBps: number
  posFeeBps: number
  minPaymentAmount: BN
  bump: number
  isActive: boolean
  totalPaymentsReceived: BN
  totalVolume: BN
}

export const LATAMLINK_PROGRAM_ID = new PublicKey("GSeGuv2K3meepgSHCehP5jGkRnjRZk96a9vsPSSJ7TjC")

export function getProgram(provider: Provider) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Anchor IDL is untyped by nature
  return new Program(IDL as any, provider)
}

export function deriveMerchantPDA(owner: PublicKey, merchantId: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("merchant"), owner.toBuffer(), merchantId.toArrayLike(Buffer, "le", 8)],
    LATAMLINK_PROGRAM_ID
  )[0]
}

export function deriveVaultPDA(merchant: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), merchant.toBuffer()],
    LATAMLINK_PROGRAM_ID
  )[0]
}

export function deriveGasVaultPDA(merchant: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("gas_vault"), merchant.toBuffer()],
    LATAMLINK_PROGRAM_ID
  )[0]
}

export function getMerchantSeeds(owner: PublicKey, merchantId: BN, bump: number) {
  return [
    Buffer.from("merchant"),
    owner.toBuffer(),
    merchantId.toArrayLike(Buffer, "le", 8),
    Buffer.from([bump]),
  ]
}

export async function fetchMerchantAccount(
  provider: Provider,
  merchantPda: PublicKey
): Promise<MerchantAccount | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Anchor account fetch returns loosely typed program
    const program = getProgram(provider) as any
    const account = await program.account.merchant.fetch(merchantPda)
    return account as MerchantAccount
  } catch {
    return null
  }
}

// Read-only scan of every merchant registered in the program — used by the
// platform admin dashboard. Needs no wallet, only a connection.
export async function fetchAllMerchantAccounts(
  connection: Connection
): Promise<{ publicKey: PublicKey; account: MerchantAccount }[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Anchor IDL is untyped by nature
  const program = new Program(IDL as any, { connection } as unknown as Provider) as any
  return await program.account.merchant.all()
}
