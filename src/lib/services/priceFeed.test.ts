import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getSolUsdPrice, convertUsdToToken, resetPriceCache } from "./priceFeed"

describe("convertUsdToToken", () => {
  it("converts a USD amount to the equivalent token amount at the given price", () => {
    expect(convertUsdToToken(10, 100)).toBe(0.1)
    expect(convertUsdToToken(10, 83.33)).toBeCloseTo(0.12, 2)
  })
})

describe("getSolUsdPrice", () => {
  beforeEach(() => {
    resetPriceCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    resetPriceCache()
  })

  it("returns the SOL price reported by the price feed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ solana: { usd: 150.25 } }),
      })
    )

    const price = await getSolUsdPrice()
    expect(price).toBe(150.25)
  })

  it("caches the price and does not re-fetch within the TTL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ solana: { usd: 100 } }),
    })
    vi.stubGlobal("fetch", fetchMock)

    await getSolUsdPrice()
    await getSolUsdPrice()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("throws when the price feed responds with a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    )

    await expect(getSolUsdPrice()).rejects.toThrow()
  })

  it("throws when the price feed returns an invalid price", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ solana: { usd: -5 } }) })
    )

    await expect(getSolUsdPrice()).rejects.toThrow()
  })
})
