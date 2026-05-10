"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { PublicKey, Connection } from "@solana/web3.js"
import {
  buildSolanaPayUrl,
  generateReferenceKey,
  watchForPayment,
  getTokenMint,
} from "./solanaPay"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { usePrivyWallet } from "@/lib/services/usePrivyWallet"
import { config } from "@/lib/config"

const connection = new Connection(config.rpcEndpoint, "confirmed")

export function useSolanaPay() {
  const wallet = usePrivyWallet()
  const { walletAddress, name, terminalId } = useMerchantStore()
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle")
  const [solanaPayUrl, setSolanaPayUrl] = useState<string | null>(null)
  const [referenceKey, setReferenceKey] = useState<string | null>(null)
  const watcherRef = useRef<{ stop: () => void } | null>(null)

  const stopWatching = useCallback(() => {
    watcherRef.current?.stop()
    watcherRef.current = null
  }, [])

  useEffect(() => {
    return () => stopWatching()
  }, [stopWatching])

  const generateUrl = useCallback(
    (amount: number, token: "usdc" | "sol") => {
      stopWatching()
      setPaymentStatus("idle")

      const recipient = walletAddress || wallet?.publicKey.toBase58() || ""
      if (!recipient) return { referenceKey: null as unknown as PublicKey, solanaPayUrl: null }

      const ref = generateReferenceKey()
      const splToken = token === "usdc" ? config.usdcMint : undefined

      const url = buildSolanaPayUrl({
        recipient,
        amount,
        splToken,
        reference: ref.publicKey.toBase58(),
        label: name,
        message: `${name} — ${terminalId}`,
      })

      setSolanaPayUrl(url.toString())
      setReferenceKey(ref.publicKey.toBase58())
      return { referenceKey: ref.publicKey, solanaPayUrl: url.toString() }
    },
    [walletAddress, wallet, name, terminalId, stopWatching]
  )

  const startWatching = useCallback(
    (reference: PublicKey) => {
      stopWatching()
      setPaymentStatus("pending")

      watcherRef.current = watchForPayment(connection, reference, (status) => {
        if (status === "confirmed") {
          setPaymentStatus("confirmed")
          setTimeout(() => {
            setPaymentStatus("idle")
            setSolanaPayUrl(null)
            setReferenceKey(null)
          }, 1500)
        } else if (status === "failed") {
          setPaymentStatus("failed")
        } else {
          setPaymentStatus("pending")
        }
      })
    },
    [connection, stopWatching]
  )

  const reset = useCallback(() => {
    stopWatching()
    setPaymentStatus("idle")
    setSolanaPayUrl(null)
    setReferenceKey(null)
  }, [stopWatching])

  return {
    solanaPayUrl,
    referenceKey,
    paymentStatus,
    setPaymentStatus,
    generateUrl,
    startWatching,
    reset,
  }
}
