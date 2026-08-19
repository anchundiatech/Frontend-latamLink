"use client"

// Lo que queda aquí opera sobre un comercio que YA existe on-chain. El alta y
// el cobro pasaron al backend: el alta porque el comercio debe quedar a nombre
// de la plataforma (es lo único que mantiene las comisiones de nuestro lado) y
// el cobro porque el fee de red lo paga el relayer.

import { AnchorProvider, BN } from "@coral-xyz/anchor"
import { Connection, PublicKey } from "@solana/web3.js"
import { useCallback, useMemo } from "react"
import { getProgram, fetchMerchantAccount, deriveVaultPDA, deriveGasVaultPDA } from "@/lib/anchor/client"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
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

export function useUpdateConfig() {
  const { program, provider, wallet } = useProgram()
  const store = useMerchantStore()

  const update = useCallback(async () => {
    if (!program || !provider || !wallet || !store.merchantPda) {
      throw new Error("Wallet or merchant not available")
    }

    const merchantPda = new PublicKey(store.merchantPda)
    const percentages: number[] = []
    for (let i = 0; i < 10; i++) {
      percentages.push(i < store.destinations.length ? store.destinations[i].percentage : 0)
    }

    const destPubkeys = store.destinations.map((d) => new PublicKey(d.address || wallet.publicKey))
    while (destPubkeys.length < 10) destPubkeys.push(wallet.publicKey)

    const tx = await program.methods
      .updateConfig(
        store.feeBps ?? 0,
        store.posFeeBps ?? 0,
        new BN(store.minPaymentAmount ?? 0),
        store.destinations.length ?? 0,
        percentages,
      )
      .accounts({
        owner: wallet.publicKey,
        merchant: merchantPda,
        destination0: destPubkeys[0],
        destination1: destPubkeys[1],
        destination2: destPubkeys[2],
        destination3: destPubkeys[3],
        destination4: destPubkeys[4],
        destination5: destPubkeys[5],
        destination6: destPubkeys[6],
        destination7: destPubkeys[7],
        destination8: destPubkeys[8],
        destination9: destPubkeys[9],
      })
      .rpc()

    return { success: true, tx }
  }, [program, provider, wallet, store])

  return { update }
}
