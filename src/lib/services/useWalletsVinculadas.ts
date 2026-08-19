"use client"

import { useCallback } from "react"
import { useLinkAccount, usePrivy } from "@privy-io/react-auth"

export interface WalletVinculada {
  address: string
  /** true si la creó Privy con el login; false si el comerciante la vinculó. */
  esDeLaCuenta: boolean
  cliente: string
}

interface CuentaVinculada {
  type?: string
  chainType?: string
  address?: string
  walletClientType?: string
}

const CLIENTES_EMBEBIDOS = new Set(["privy", "privy-v2"])

/**
 * Wallets de Solana asociadas al comerciante, y la acción para sumar una propia.
 *
 * Vincular una wallet es **opcional**: el comercio funciona con la cuenta que
 * Privy crea al entrar con Google. Sirve para cobrar directo a una billetera
 * que el comerciante ya usa, sin tener que copiar direcciones a mano.
 *
 * Lo que se vincula se usa solo para **recibir**: el comerciante nunca firma
 * nada, ni siquiera con su propia wallet.
 */
export function useWalletsVinculadas() {
  const { user, ready } = usePrivy()
  const { linkWallet } = useLinkAccount()

  const cuentas = (user?.linkedAccounts ?? []) as CuentaVinculada[]

  const wallets: WalletVinculada[] = cuentas
    .filter((c) => c.type === "wallet" && c.chainType === "solana" && c.address)
    .map((c) => ({
      address: c.address!,
      esDeLaCuenta: CLIENTES_EMBEBIDOS.has(c.walletClientType ?? ""),
      cliente: c.walletClientType ?? "desconocido",
    }))

  const vincular = useCallback(() => {
    linkWallet({ walletChainType: "solana-only" })
  }, [linkWallet])

  return { wallets, vincular, listo: ready }
}
