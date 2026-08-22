"use client"

// Aquí solo queda lectura on-chain. Todo lo que escribe en la cadena vive en el
// backend y lo firma la plataforma, que es el owner de los comercios: el alta,
// el cobro y la edición de la configuración. El comerciante nunca firma ni
// necesita SOL — de hecho, cuando la edición se firmaba desde el navegador con
// su cuenta, el contrato la rechazaba por `has_one = owner`.

import { AnchorProvider } from "@coral-xyz/anchor"
import { Connection, PublicKey } from "@solana/web3.js"
import { useCallback, useMemo } from "react"
import { getProgram, fetchMerchantAccount } from "@/lib/anchor/client"
import { usePrivyWallet } from "@/lib/services/usePrivyWallet"
import { config } from "@/lib/config"

const connection = new Connection(config.rpcEndpoint, "confirmed")

export function useProgram() {
  const wallet = usePrivyWallet()

  const provider = useMemo(() => {
    if (!wallet) return null
    return new AnchorProvider(connection, wallet, { commitment: "confirmed" })
  }, [wallet])

  const program = useMemo(() => {
    if (!provider) return null
    return getProgram(provider)
  }, [provider])

  return { program, provider, wallet }
}

export function useFetchMerchant() {
  const { program, provider } = useProgram()

  const fetchMerchant = useCallback(
    async (merchantPda: string) => {
      if (!provider) return null
      const pda = new PublicKey(merchantPda)
      return await fetchMerchantAccount(provider, pda)
    },
    [provider]
  )

  return { fetchMerchant }
}
