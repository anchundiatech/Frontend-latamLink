import { PublicKey, SystemProgram, type Connection } from "@solana/web3.js"
import { type Provider, Program, type BN, type Idl } from "@coral-xyz/anchor"
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

/**
 * Vista tipada del programa. El IDL se carga como JSON, así que Anchor no puede
 * inferir las cuentas: se declara aquí la forma que realmente usamos.
 */
type MerchantProgram = Program<Idl> & {
  account: {
    merchant: {
      fetch(address: PublicKey): Promise<MerchantAccount>
      all(): Promise<{ publicKey: PublicKey; account: MerchantAccount }[]>
    }
  }
}

export function getProgram(provider: Provider): MerchantProgram {
  return new Program(IDL as Idl, provider) as unknown as MerchantProgram
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
    const program = getProgram(provider)
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
  const program = new Program(
    IDL as Idl,
    { connection } as unknown as Provider
  ) as unknown as MerchantProgram
  return await program.account.merchant.all()
}
