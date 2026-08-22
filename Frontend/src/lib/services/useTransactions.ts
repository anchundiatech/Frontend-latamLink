"use client"

import { useEffect, useCallback } from "react"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useTxStore } from "@/lib/store/useTxStore"

export function useTransactions() {
  const { merchantDbId, terminalId } = useMerchantStore()
  const transactions = useTxStore((s) => s.transactions)
  const loading = useTxStore((s) => s.loading)
  const fetch = useTxStore((s) => s.fetch)

  useEffect(() => {
    // Sin comercio en la base todavía no hay historial que mostrar.
    if (merchantDbId) void fetch(merchantDbId, terminalId)
  }, [merchantDbId, terminalId, fetch])

  const refresh = useCallback(() => {
    useTxStore.setState({ lastFetched: 0 })
    if (merchantDbId) void fetch(merchantDbId, terminalId)
  }, [merchantDbId, terminalId, fetch])

  return { transactions, loading, refresh }
}
