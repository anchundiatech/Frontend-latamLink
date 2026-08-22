"use server"

import { Connection, Keypair } from "@solana/web3.js"

// Coste aproximado de un alta on-chain (renta de las tres cuentas).
const ONBOARDING_LAMPORTS = 10_000_000

export type TreasuryStatus = {
  address: string
  sol: number
  onboardingsLeft: number
} | null

// La clave nunca sale del servidor: solo se devuelven la dirección derivada y
// el saldo. Desde que el alta la hace el relayer con la wallet de la
// plataforma, esto sirve como panel de control del saldo que la financia.
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
      onboardingsLeft: Math.floor(lamports / ONBOARDING_LAMPORTS),
    }
  } catch (err) {
    console.error("Failed to read treasury status", err)
    return null
  }
}
