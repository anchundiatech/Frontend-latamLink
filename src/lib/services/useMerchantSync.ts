"use client"

import { useCallback, useEffect, useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { useMerchantStore } from "@/lib/store/useMerchantStore"

interface ApiDestination {
  id: string
  destinationPubkey: string
  percentage: number
  positionIndex: number
  description: string | null
}

interface ApiTerminal {
  id: string
  posTerminalId: string
}

interface ApiMerchant {
  id: string
  merchantIdOnchain: string
  pdaAddress: string
  pdaPaymentVault: string
  pdaGasVault: string
  name: string
  feeBps: number
  posFeeBps: number
  minPaymentAmount: string
  isActive: boolean
  totalVolume: string
  destinations?: ApiDestination[]
  terminals?: ApiTerminal[]
}

interface ApiOwner {
  id: string
  merchants: ApiMerchant[]
}

const TOKEN_DECIMALS = 6

interface CuentaVinculada {
  type?: string
  chainType?: string
  address?: string
}

/**
 * Carga el comercio desde PostgreSQL y llena el estado local.
 *
 * Antes la configuración vivía solo en el navegador, así que un comerciante que
 * limpiaba el navegador o entraba desde el teléfono se encontraba sin su
 * comercio. Ahora el navegador es una copia: la fuente de verdad es la base.
 */
export function useMerchantSync() {
  // Se toma la dirección de la sesión de Privy y no del hook de wallets: ese
  // exige el proveedor montado, y el portal se prerenderiza durante el build.
  const { user } = usePrivy()
  const setMerchant = useMerchantStore((s) => s.setMerchant)
  const guardada = useMerchantStore((s) => s.walletAddress)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [found, setFound] = useState<boolean | null>(null)

  const cuentas = (user?.linkedAccounts ?? []) as CuentaVinculada[]
  const walletAddress =
    cuentas.find((c) => c.type === "wallet" && c.chainType === "solana")?.address ??
    guardada ??
    null

  const sync = useCallback(async () => {
    if (!walletAddress) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/merchants?owner=${walletAddress}`)

      if (res.status === 404) {
        // Todavía no dio de alta su comercio: no es un error.
        setFound(false)
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "No se pudo cargar el comercio")
      }

      const owner = (await res.json()) as ApiOwner
      const merchant = owner.merchants?.[0]
      if (!merchant) {
        setFound(false)
        return
      }

      const destinations = (merchant.destinations ?? [])
        .slice()
        .sort((a, b) => a.positionIndex - b.positionIndex)
        .map((d) => ({
          id: d.id,
          address: d.destinationPubkey,
          label: d.description ?? `Destino ${d.positionIndex + 1}`,
          percentage: d.percentage,
        }))

      const terminal = merchant.terminals?.[0]

      setMerchant({
        name: merchant.name,
        merchantId: Number(merchant.merchantIdOnchain),
        merchantPda: merchant.pdaAddress,
        vaultPda: merchant.pdaPaymentVault,
        gasVaultPda: merchant.pdaGasVault,
        merchantDbId: merchant.id,
        terminalDbId: terminal?.id ?? null,
        terminalId: terminal?.posTerminalId ?? "",
        feeBps: merchant.feeBps,
        posFeeBps: merchant.posFeeBps,
        // On-chain los montos son enteros en unidades mínimas; la interfaz
        // trabaja con la cifra que escribe una persona.
        minPaymentAmount: Number(merchant.minPaymentAmount) / 10 ** TOKEN_DECIMALS,
        isActive: merchant.isActive,
        totalVolume: Number(merchant.totalVolume) / 10 ** TOKEN_DECIMALS,
        walletAddress,
        ...(destinations.length > 0 ? { destinations } : {}),
      })
      setFound(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [walletAddress, setMerchant])

  useEffect(() => {
    void sync()
  }, [sync])

  return { loading, error, found, resync: sync }
}
