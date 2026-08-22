"use server"

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js"

// The merchant only ever RECEIVES money — they must never fund their own
// account. The platform treasury sponsors the one-time network cost of
// setting up their terminal, exactly like a fintech absorbing account
// creation costs. Devnet uses a throwaway keypair from .env; mainnet should
// move to proper fee sponsorship before launch.

const SPONSOR_LAMPORTS = 10_000_000 // 0.01 SOL — covers setup fee + rent

export type SponsorResult =
  | { funded: true }
  | { funded: false; reason: "not_configured" | "invalid_address" | "treasury_empty" | "transfer_failed" }

export async function sponsorMerchantSetup(address: string): Promise<SponsorResult> {
  const secret = process.env.TREASURY_SECRET_KEY
  if (!secret) return { funded: false, reason: "not_configured" }

  let recipient: PublicKey
  try {
    recipient = new PublicKey(address)
  } catch {
    return { funded: false, reason: "invalid_address" }
  }

  const connection = new Connection(
    process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com",
    "confirmed"
  )

  try {
    const balance = await connection.getBalance(recipient)
    if (balance >= SPONSOR_LAMPORTS) return { funded: true }

    const treasury = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)))
    const treasuryBalance = await connection.getBalance(treasury.publicKey)
    // Keep enough behind for the transfer fee itself.
    if (treasuryBalance < SPONSOR_LAMPORTS + 5_000) {
      console.error(
        `Treasury ${treasury.publicKey.toBase58()} is out of funds (${treasuryBalance} lamports)`
      )
      return { funded: false, reason: "treasury_empty" }
    }

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasury.publicKey,
        toPubkey: recipient,
        lamports: SPONSOR_LAMPORTS,
      })
    )
    await sendAndConfirmTransaction(connection, tx, [treasury])
    return { funded: true }
  } catch (err) {
    console.error("Failed to sponsor merchant setup", err)
    return { funded: false, reason: "transfer_failed" }
  }
}
