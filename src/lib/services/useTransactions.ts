"use client"

import { useEffect, useCallback } from "react"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useTxStore } from "@/lib/store/useTxStore"
import { Connection } from "@solana/web3.js"
import { config } from "@/lib/config"

const connection = new Connection(config.rpcEndpoint, "confirmed")

export function useTransactions() {
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
