import { describe, it, expect, vi, beforeEach } from "vitest"
import { useTxStore } from "./useTxStore"

// USDC tiene 6 decimales y SOL 9 (lamports): leer un pago con la escala
// equivocada muestra un monto mil veces más grande o más chico de lo real.
describe("useTxStore.fetch", () => {
  beforeEach(() => {
    useTxStore.setState({ transactions: [], loading: false, lastFetched: 0 })
    vi.restoreAllMocks()
  })

  it("escala USDC y SOL con sus propios decimales", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          payments: [
            {
              id: "1",
              txSignature: "a".repeat(64),
              payerPubkey: "payer-usdc",
              amountGross: "1000000", // 1 USDC (6 decimales)
              token: "USDC",
              timestamp: new Date().toISOString(),
              status: "CONFIRMED",
            },
            {
              id: "2",
              txSignature: "b".repeat(64),
              payerPubkey: "payer-sol",
              amountGross: "100000000", // 0.1 SOL (9 decimales, lamports)
              token: "SOL",
              timestamp: new Date().toISOString(),
              status: "CONFIRMED",
            },
          ],
        }),
      })
    )

    await useTxStore.getState().fetch("merchant-1", "term-1")

    const [usdc, sol] = useTxStore.getState().transactions
    expect(usdc?.token).toBe("USDC")
    expect(usdc?.amount).toBe(1)
    expect(sol?.token).toBe("SOL")
    expect(sol?.amount).toBeCloseTo(0.1, 9)
  })
})
