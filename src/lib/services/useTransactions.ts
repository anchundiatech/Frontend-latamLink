"use client"

import { useEffect, useCallback } from "react"
import { useConnection } from "@solana/wallet-adapter-react"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useTxStore } from "@/lib/store/useTxStore"

export function useTransactions() {
  const { connection } = useConnection()
  const { walletAddress, terminalId } = useMerchantStore()
  const transactions = useTxStore((s) => s.transactions)
  const loading = useTxStore((s) => s.loading)
  const fetch = useTxStore((s) => s.fetch)

  useEffect(() => {
    if (walletAddress) fetch(connection, walletAddress, terminalId)
  }, [walletAddress, connection, fetch])

  const refresh = useCallback(() => {
    useTxStore.setState({ lastFetched: 0 })
    if (walletAddress) fetch(connection, walletAddress, terminalId)
  }, [walletAddress, connection, fetch])

  return { transactions, loading, refresh }
}
