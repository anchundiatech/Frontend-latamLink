import { describe, it, expect } from "vitest"
import { computeSplit } from "./split"

describe("computeSplit", () => {
  // Números tomados de un cobro real en devnet (2 unidades, comisión POS 50
  // bps, comisión de gas 100 bps, reparto 60/40).
  it("reproduce el reparto que hizo el contrato", () => {
    const result = computeSplit({
      amount: 2_000_000n,
      posFeeBps: 50,
      feeBps: 100,
      percentages: [60, 40],
    })

    expect(result.posFee).toBe(10_000n)
    expect(result.gasFee).toBe(19_900n)
    expect(result.splits).toEqual([1_182_060n, 788_040n])
    expect(result.dust).toBe(0n)
  })

  it("manda el remanente de redondeo a la comisión de gas, sin perder nada", () => {
    const amount = 1_000_001n
    const result = computeSplit({
      amount,
      posFeeBps: 50,
      feeBps: 100,
      percentages: [33, 33, 34],
    })

    const repartido =
      result.posFee +
      result.gasFee +
      result.dust +
      result.splits.reduce((total, value) => total + value, 0n)

    expect(repartido).toBe(amount)
    expect(result.dust).toBeGreaterThan(0n)
  })

  it("sin comisiones configuradas, todo va a los destinos", () => {
    const result = computeSplit({
      amount: 500_000n,
      posFeeBps: 0,
      feeBps: 0,
      percentages: [50, 50],
    })

    expect(result.posFee).toBe(0n)
    expect(result.gasFee).toBe(0n)
    expect(result.splits).toEqual([250_000n, 250_000n])
    expect(result.dust).toBe(0n)
  })
})
