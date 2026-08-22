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

/** Convierte un monto escrito por una persona (1.5) a unidades mínimas. */
export function toMinimalUnits(amount: number, decimals: number): string {
  return BigInt(Math.round(amount * 10 ** decimals)).toString()
}
