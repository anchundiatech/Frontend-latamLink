import { PublicKey, Keypair, Connection, VersionedTransactionResponse } from "@solana/web3.js"
import { config } from "@/lib/config"
import { withRetry } from "./retry"
import {
  PAYMENT_WATCH_INTERVAL_MS,
  PAYMENT_WATCH_MAX_ATTEMPTS,
  type WatcherStatus,
} from "@/lib/payments/paymentStatus"

export interface SolanaPayParams {
  recipient: string
  amount: number
  splToken?: string
  reference: string
  label?: string
  message?: string
  memo?: string
}

export function buildSolanaPayUrl(params: SolanaPayParams): URL {
  const url = new URL(`solana:${params.recipient}`)

  if (params.amount > 0) {
    url.searchParams.set("amount", params.amount.toFixed(6))
  }

  if (params.splToken) {
    url.searchParams.set("spl-token", params.splToken)
  }

  url.searchParams.set("reference", params.reference)

  if (params.label) {
    url.searchParams.set("label", params.label)
  }

  if (params.message) {
    url.searchParams.set("message", params.message)
  }

  if (params.memo) {
    url.searchParams.set("memo", params.memo)
  }

  return url
}

export function generateReferenceKey(): { publicKey: PublicKey; secretKey: Uint8Array } {
  const keypair = Keypair.generate()
  return {
    publicKey: keypair.publicKey,
    secretKey: keypair.secretKey,
  }
}

export async function findTransactionByReference(
  connection: Connection,
  reference: PublicKey,
  commitment: "confirmed" | "finalized" = "confirmed",
  signal?: AbortSignal
): Promise<VersionedTransactionResponse | null> {
  const signatures = await withRetry(
    () => connection.getSignaturesForAddress(reference, { limit: 1 }, commitment),
    { maxRetries: 3, baseDelayMs: 2000 }
  )
  if (!signatures.length) return null
  const tx = await withRetry(
    () =>
      connection.getTransaction(signatures[0].signature, {
        commitment,
        maxSupportedTransactionVersion: 0,
      }),
    { maxRetries: 3, baseDelayMs: 2000 }
  )
  return tx
}

export function watchForPayment(
  connection: Connection,
  reference: PublicKey,
  onStatusChange: (status: WatcherStatus) => void,
  commitment: "confirmed" | "finalized" = "confirmed",
  maxAttempts = PAYMENT_WATCH_MAX_ATTEMPTS,
  intervalMs = PAYMENT_WATCH_INTERVAL_MS
): { stop: () => void } {
  let attempts = 0
  let stopped = false
  let consecutiveErrors = 0

  const check = async () => {
    if (stopped || attempts >= maxAttempts) {
      if (attempts >= maxAttempts && !stopped) {
        onStatusChange("failed")
      }
      return
    }
    attempts++
    onStatusChange("pending")

    try {
      const tx = await findTransactionByReference(connection, reference, commitment)
      if (tx) {
        onStatusChange("confirmed")
        return
      }
      consecutiveErrors = 0
    } catch (err) {
      consecutiveErrors++
      const backoff = consecutiveErrors > 2 ? Math.min(10000, intervalMs * consecutiveErrors) : 0
      if (backoff > 0) {
        await new Promise((r) => setTimeout(r, backoff))
      }
    }

    setTimeout(check, intervalMs)
  }

  check()
  return { stop: () => { stopped = true } }
}

export function getTokenMint(token: "usdc" | "sol"): string {
  return token === "usdc" ? config.usdcMint : config.solMint
}
