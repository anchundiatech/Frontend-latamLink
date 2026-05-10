import { create } from "zustand"
import { type Connection, PublicKey } from "@solana/web3.js"

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

        const txs: PaymentTx[] = sigs.map((sig) => ({
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
        }))

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
