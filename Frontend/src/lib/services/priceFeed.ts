const CACHE_TTL_MS = 30_000

let cachedPrice: number | null = null
let cachedAt = 0
let inflightRequest: Promise<number> | null = null

async function fetchSolUsdPrice(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
  )
  if (!res.ok) {
    throw new Error(`Price feed request failed with status ${res.status}`)
  }
  const data = await res.json()
  const price = data?.solana?.usd
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error("Price feed returned an invalid SOL price")
  }
  return price
}

export async function getSolUsdPrice(): Promise<number> {
  const now = Date.now()
  if (cachedPrice !== null && now - cachedAt < CACHE_TTL_MS) {
    return cachedPrice
  }
  if (inflightRequest) {
    return inflightRequest
  }

  inflightRequest = fetchSolUsdPrice()
    .then((price) => {
      cachedPrice = price
      cachedAt = Date.now()
      return price
    })
    .finally(() => {
      inflightRequest = null
    })

  return inflightRequest
}

export function convertUsdToToken(usdAmount: number, solUsdPrice: number): number {
  return usdAmount / solUsdPrice
}

// Redondea hacia abajo a precisión de lamport (9 decimales). Una división de
// punto flotante como usdAmount/solUsdPrice casi nunca cae justo en un número
// entero de lamports; sin este redondeo, algunas wallets (Phantom) se cuelgan
// calculando la comisión de un monto con más de 9 decimales en vez de
// mostrar un error.
export function roundDownToLamports(solAmount: number): number {
  return Math.floor(solAmount * 1e9) / 1e9
}

export function resetPriceCache(): void {
  cachedPrice = null
  cachedAt = 0
  inflightRequest = null
}
