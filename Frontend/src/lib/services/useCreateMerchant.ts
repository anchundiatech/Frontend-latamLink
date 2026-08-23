"use client"

import { useCallback } from "react"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { fetchBackendConfig, toMinimalUnits } from "./useBackendConfig"
import { useCuentaDePago } from "./useCuentaDePago"

export interface CreatedMerchant {
  merchant: string
  merchantId: string
  owner: string
  vault: string
  gasVault: string
  signature: string
  name: string
  merchantDbId?: string
  terminalDbId?: string
  /** Presente si el alta on-chain salió bien pero la base falló. */
  warning?: string
}

/**
 * Da de alta el comercio on-chain a través del backend.
 *
 * Antes lo creaba el navegador con la wallet del comercio como `owner`, lo que
 * dejaba las comisiones del lado del comercio (el contrato solo permite retirar
 * el gas_vault al owner) y obligaba a patrocinarle SOL para que pudiera firmar.
 * Ahora lo crea el relayer con la wallet de la plataforma: las comisiones son
 * de la plataforma y el comercio no firma ni paga nada.
 */
export function useCreateMerchant() {
  // La cuenta de pago sale de la sesión: Privy la crea al entrar con Google y
  // el comerciante no conecta nada.
  const cuentaDePago = useCuentaDePago()

  const create = useCallback(async (): Promise<CreatedMerchant> => {
    if (!cuentaDePago) {
      throw new Error(
        "Todavía estamos preparando tu cuenta de pago. Probá de nuevo en unos segundos."
      )
    }

    const config = await fetchBackendConfig()
    if (!config.paymentTokenMint) {
      throw new Error(
        "El backend todavía no tiene un token de pago configurado. Ejecutá la preparación de devnet."
      )
    }

    // Se lee el estado recién acá (no como valor ya desestructurado del hook)
    // porque quien llama a create() suele actualizar el store y disparar la
    // creación en el mismo evento, antes de que el componente vuelva a
    // renderizar con los datos nuevos.
    const store = useMerchantStore.getState()

    const active = store.destinations.filter((d) => d.percentage > 0 && d.address.trim())
    if (active.length === 0) {
      throw new Error("Configurá al menos un destino con su porcentaje")
    }

    const res = await fetch("/api/merchants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: store.name || "Comercio LatamLink",
        posTerminalId: store.terminalId || "TERM-001",
        paymentTokenMint: config.paymentTokenMint,
        destinations: active.map((d) => d.address.trim()),
        percentages: active.map((d) => d.percentage),
        feeBps: store.feeBps ?? 0,
        posFeeBps: store.posFeeBps ?? 0,
        // El comercio escribe "1" pensando en 1 USDC; on-chain son millonésimas.
        minPaymentAmount: toMinimalUnits(store.minPaymentAmount || 0, config.tokenDecimals),
        // Identidad del comerciante: con esta wallet recupera su comercio
        // desde cualquier dispositivo.
        ownerPubkey: cuentaDePago,
        email: store.email || undefined,
        labels: active.map((d) => d.label),
      }),
    })

    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(payload.error ?? "No se pudo crear el comercio")
    }

    const created = payload as CreatedMerchant
    store.setMerchantPda(created.merchant)
    store.setVaultPda(created.vault)
    store.setGasVaultPda(created.gasVault)
    store.setMerchant({
      isActive: true,
      merchantId: Number(created.merchantId),
      merchantDbId: created.merchantDbId ?? null,
      terminalDbId: created.terminalDbId ?? null,
      walletAddress: cuentaDePago,
    })

    return created
  }, [cuentaDePago])

  return { create }
}
