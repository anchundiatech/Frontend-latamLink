import { create } from "zustand"
import { type Connection, PublicKey } from "@solana/web3.js"
import { config } from "@/lib/config"

export interface PaymentTx {
  id: string
  amount: number
  token: "USDC" | "SOL"
  status: "confirmed" | "pending" | "failed"
  date: Date
  terminal: string
  payer: string
  signature: string
}

interface TxStore {
  transactions: PaymentTx[]
  loading: boolean
  lastFetched: number
  fetch: (connection: Connection, walletAddress: string, terminalId: string) => Promise<void>
}

let inFlight: Promise<void> | null = null

export const useTxStore = create<TxStore>((set) => ({
  transactions: [],
  loading: false,
  lastFetched: 0,
  fetch: async (connection, walletAddress, terminalId) => {
    const now = Date.now()
    const state = useTxStore.getState()
    if (state.lastFetched > now - 30000 || inFlight) {
      await inFlight
      return
    }

    set({ loading: true })

    inFlight = (async () => {
      try {
        const pubkey = new PublicKey(walletAddress)
        const sigs = await connection.getSignaturesForAddress(
          pubkey,
          { limit: 10 },
          "confirmed"
        )

        const txs: PaymentTx[] = []

        for (const sig of sigs) {
          const tx = await connection.getTransaction(sig.signature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          })

          if (!tx) {
            txs.push({
              id: sig.signature.slice(0, 16),
              amount: 0,
              token: "SOL" as const,
              status:
                sig.confirmationStatus === "confirmed" || sig.confirmationStatus === "finalized"
                  ? ("confirmed" as const)
                  : ("failed" as const),
              date: new Date((sig.blockTime ?? Math.floor(now / 1000)) * 1000),
              terminal: terminalId,
              payer: sig.signature.slice(0, 8),
              signature: `${sig.signature.slice(0, 4)}...${sig.signature.slice(-4)}`,
            })
            continue
          }

          let amount = 0
          let token: "USDC" | "SOL" = "SOL"
          let payer = ""

          const accountKeys = tx.transaction.message.staticAccountKeys
          const feePayer = accountKeys[0]?.toBase58()
          if (feePayer && feePayer !== walletAddress) {
            payer = feePayer
          }

          if (tx.meta?.postTokenBalances) {
            const merchantUsdcPost = tx.meta.postTokenBalances.find(
              (b) => b.mint === config.usdcMint && b.owner === walletAddress
            )
            const merchantUsdcPre = tx.meta.preTokenBalances?.find(
              (b) => b.mint === config.usdcMint && b.owner === walletAddress
            )

            if (merchantUsdcPost) {
              const postAmt = parseFloat(merchantUsdcPost.uiTokenAmount.uiAmountString || "0")
              const preAmt = parseFloat(merchantUsdcPre?.uiTokenAmount.uiAmountString || "0")
              const diff = postAmt - preAmt
              if (diff > 0) {
                amount = diff
                token = "USDC"
              }
            }
          }

          if (amount === 0 && tx.meta) {
            const merchantIndex = accountKeys.findIndex(
              (key) => key.toBase58() === walletAddress
            )
            if (merchantIndex >= 0) {
              const postBal = tx.meta.postBalances[merchantIndex] ?? 0
              const preBal = tx.meta.preBalances[merchantIndex] ?? 0
              const diff = postBal - preBal
              if (diff > 0) {
                amount = diff / 1_000_000_000
                token = "SOL"
              }
            }
          }

          txs.push({
            id: sig.signature.slice(0, 16),
            amount: Math.max(0, amount),
            token,
            status: "confirmed" as const,
            date: new Date((sig.blockTime ?? Math.floor(now / 1000)) * 1000),
            terminal: terminalId,
            payer: payer || sig.signature.slice(0, 8),
            signature: `${sig.signature.slice(0, 4)}...${sig.signature.slice(-4)}`,
          })
        }

        set({ transactions: txs, lastFetched: now })
      } catch {
        // silent
      } finally {
        set({ loading: false })
        inFlight = null
      }
    })()

    await inFlight
  },
}))
