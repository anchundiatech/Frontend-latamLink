"use client"

import { useCallback, useEffect, useState } from "react"

export interface BackendConfig {
  programId: string
  cluster: string
  relayer: string
  paymentTokenMint: string | null
  tokenDecimals: number
  demoMerchant: string | null
  platformOwner: string | null
  maxDestinations: number
}

let cached: BackendConfig | null = null

/**
 * Configuración del rail de pagos, servida por el backend.
 *
 * El mint en uso depende del entorno (en devnet se usa uno propio), así que
 * hardcodearlo en la app hacía que el pago fallara al cambiar de red.
 */
export async function fetchBackendConfig(): Promise<BackendConfig> {
  if (cached) return cached
  const res = await fetch("/api/config")
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? "No se pudo obtener la configuración de pagos")
  }
  cached = (await res.json()) as BackendConfig
  return cached
}

export function useBackendConfig() {
  const [config, setConfig] = useState<BackendConfig | null>(cached)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!cached)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setConfig(await fetchBackendConfig())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!cached) void load()
  }, [load])

  return { config, loading, error, reload: load }
}

/**
 * Convierte un monto escrito por una persona (1.5) a unidades mínimas.
 *
 * `amount * 10 ** decimals` opera en punto flotante y puede redondear mal
 * montos exactos (1.005 * 100 da 100.49999999999999 en JS, no 100.5): acá se
 * trabaja sobre la representación decimal en string, sin multiplicar floats.
 */
export function toMinimalUnits(amount: number, decimals: number): string {
  const negative = amount < 0
  const [wholePart = "0", fractionPart = ""] = Math.abs(amount).toString().split(".")

  const fractionDigits = fractionPart.padEnd(decimals + 1, "0")
  const kept = fractionDigits.slice(0, decimals)
  const roundUp = fractionDigits.charAt(decimals) >= "5"

  let value = BigInt(wholePart + kept)
  if (roundUp) value += 1n

  return (negative ? -value : value).toString()
}
