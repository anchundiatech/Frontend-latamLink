import { create } from "zustand"
import type { PersistedPaymentStatus } from "@/lib/payments/paymentStatus"

export interface PaymentTx {
  id: string
  amount: number
  token: "USDC" | "SOL"
  status: PersistedPaymentStatus
  date: Date
  terminal: string
  payer: string
  signature: string
}

interface ApiPayment {
  id: string
  txSignature: string
  payerPubkey: string
  amountGross: string
  timestamp: string
  status: "PENDING" | "CONFIRMED" | "FAILED"
  terminal?: { posTerminalId: string }
}

interface TxStore {
  transactions: PaymentTx[]
  loading: boolean
  lastFetched: number
  fetch: (merchantDbId: string, terminalId: string) => Promise<void>
}

const TOKEN_DECIMALS = 6
const CACHE_MS = 30_000

let inFlight: Promise<void> | null = null

const estadoLegible = {
  CONFIRMED: "confirmed",
  PENDING: "pending",
  FAILED: "failed",
} as const

/**
 * Historial de cobros leído de PostgreSQL.
 *
 * Antes se reconstruía escaneando la wallet del comercio en la cadena, algo que
 * dejó de funcionar cuando los cobros pasaron a repartirse entre cuentas de
 * token: esa wallet ya no recibe nada. La base guarda el importe, las
 * comisiones y la terminal exactos de cada cobro.
 */
export const useTxStore = create<TxStore>((set) => ({
  transactions: [],
  loading: false,
  lastFetched: 0,
  fetch: async (merchantDbId, terminalId) => {
    const now = Date.now()
    const state = useTxStore.getState()
    if (state.lastFetched > now - CACHE_MS || inFlight) {
      await inFlight
      return
    }

    set({ loading: true })

    inFlight = (async () => {
      try {
        const res = await fetch(`/api/payments?merchantId=${merchantDbId}&limit=50`)
        if (!res.ok) return

        const { payments } = (await res.json()) as { payments: ApiPayment[] }

        set({
          transactions: payments.map((p) => ({
            id: p.id,
            amount: Number(p.amountGross) / 10 ** TOKEN_DECIMALS,
            token: "USDC" as const,
            status: estadoLegible[p.status],
            date: new Date(p.timestamp),
            terminal: p.terminal?.posTerminalId ?? terminalId,
            payer: p.payerPubkey,
            signature: `${p.txSignature.slice(0, 4)}...${p.txSignature.slice(-4)}`,
          })),
          lastFetched: now,
        })
      } catch (err) {
        // Un fallo de red no debe romper el panel: se conserva lo último leído.
        console.error("No se pudo actualizar el historial de pagos:", err)
      } finally {
        set({ loading: false })
        inFlight = null
      }
    })()

    await inFlight
  },
}))
