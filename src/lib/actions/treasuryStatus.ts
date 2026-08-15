"use server"

import { Connection, Keypair } from "@solana/web3.js"

const SPONSOR_LAMPORTS = 10_000_000 // keep in sync with sponsorMerchantSetup

export type TreasuryStatus = {
  address: string
  sol: number
  onboardingsLeft: number
} | null

// The secret key never leaves the server — only the derived public address
// and balance are returned.
export async function getTreasuryStatus(): Promise<TreasuryStatus> {
  const secret = process.env.TREASURY_SECRET_KEY
  if (!secret) return null

  try {
    const treasury = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)))
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com",
      "confirmed"
    )
    const lamports = await connection.getBalance(treasury.publicKey)
    return {
      address: treasury.publicKey.toBase58(),
      sol: lamports / 1_000_000_000,
      onboardingsLeft: Math.floor(lamports / SPONSOR_LAMPORTS),
    }
  } catch (err) {
    console.error("Failed to read treasury status", err)
    return null
  }
}
