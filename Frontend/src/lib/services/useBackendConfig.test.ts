import { describe, it, expect } from "vitest"
import { toMinimalUnits } from "./useBackendConfig"

describe("toMinimalUnits", () => {
  it("converts a whole dollar amount to minimal units at 6 decimals (USDC)", () => {
    expect(toMinimalUnits(10, 6)).toBe("10000000")
  })

  it("converts a two-decimal amount exactly", () => {
    expect(toMinimalUnits(12.5, 6)).toBe("12500000")
  })

  it("rounds instead of truncating floating point drift", () => {
    // 0.1 + 0.2 style float error: 1.005 * 100 is 100.49999999999999 in JS.
    expect(toMinimalUnits(1.005, 2)).toBe("101")
  })

  it("returns an integer string safe for BigInt, never scientific notation", () => {
    const result = toMinimalUnits(1234.56, 6)
    expect(result).toBe("1234560000")
    expect(() => BigInt(result)).not.toThrow()
  })

  it("handles zero decimals", () => {
    expect(toMinimalUnits(5, 0)).toBe("5")
  })
})
