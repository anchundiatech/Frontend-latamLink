"use client"

import { useCallback } from "react"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { fetchBackendConfig, toMinimalUnits } from "./useBackendConfig"

/**
 * Guarda cambios de reparto y comisiones del comercio.
 *
 * Lo aplica el backend firmando con la wallet de la plataforma, que es el owner
 * on-chain. El comerciante no firma ni necesita SOL.
 */
export function useUpdateMerchantConfig() {
  const store = useMerchantStore()

  const update = useCallback(async (): Promise<{ signature: string }> => {
    if (!store.merchantPda) {
      throw new Error("El comercio todavía no existe on-chain")
    }

    const active = store.destinations.filter((d) => d.percentage > 0 && d.address.trim())
    if (active.length === 0) {
      throw new Error("Configurá al menos un destino con su porcentaje")
    }

    const config = await fetchBackendConfig()

    const res = await fetch(`/api/merchants/${store.merchantPda}/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinations: active.map((d) => d.address.trim()),
        percentages: active.map((d) => d.percentage),
        feeBps: store.feeBps ?? 0,
        posFeeBps: store.posFeeBps ?? 0,
        minPaymentAmount: toMinimalUnits(store.minPaymentAmount || 0, config.tokenDecimals),
      }),
    })

    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(payload.error ?? "No se pudo guardar la configuración")
    }

    return payload as { signature: string }
  }, [store])

  return { update }
}
