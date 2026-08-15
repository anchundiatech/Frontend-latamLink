"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { PublicKey, Connection } from "@solana/web3.js"
import {
  buildSolanaPayUrl,
  generateReferenceKey,
  watchForPayment,
  getTokenMint,
} from "./solanaPay"
import { getSolUsdPrice, convertUsdToToken } from "./priceFeed"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useTxStore } from "@/lib/store/useTxStore"
import { usePrivyWallet } from "@/lib/services/usePrivyWallet"
import { config } from "@/lib/config"

const connection = new Connection(config.rpcEndpoint, "confirmed")

export function useSolanaPay() {
  const wallet = usePrivyWallet()
  const { walletAddress, name, terminalId } = useMerchantStore()
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle")
  const [solanaPayUrl, setSolanaPayUrl] = useState<string | null>(null)
  const [referenceKey, setReferenceKey] = useState<string | null>(null)
  const [cryptoAmount, setCryptoAmount] = useState<number | null>(null)
  const watcherRef = useRef<{ stop: () => void } | null>(null)
  const currentAmountRef = useRef(0)

  const stopWatching = useCallback(() => {
    watcherRef.current?.stop()
    watcherRef.current = null
  }, [])

  useEffect(() => {
    return () => stopWatching()
  }, [stopWatching])

  const generateUrl = useCallback(
    async (usdAmount: number, token: "usdc" | "sol") => {
      currentAmountRef.current = usdAmount
      stopWatching()
      setPaymentStatus("idle")
      setCryptoAmount(null)

      const recipient = walletAddress || wallet?.publicKey.toBase58() || ""
      if (!recipient) {
        return { referenceKey: null as unknown as PublicKey, solanaPayUrl: null, cryptoAmount: null, error: null }
      }

      // USDC is a stablecoin, 1 USDC ≈ 1 USD — the amount the merchant typed
      // can be used directly. SOL is a volatile asset, so it must be converted
      // to its real-time equivalent before the customer's wallet ever sees it.
      let tokenAmount = usdAmount
      if (token === "sol") {
        try {
          const solPrice = await getSolUsdPrice()
          tokenAmount = convertUsdToToken(usdAmount, solPrice)
        } catch {
          return { referenceKey: null as unknown as PublicKey, solanaPayUrl: null, cryptoAmount: null, error: "price_unavailable" as const }
        }
      }

      const ref = generateReferenceKey()
      const splToken = token === "usdc" ? config.usdcMint : undefined

      const url = buildSolanaPayUrl({
        recipient,
        amount: tokenAmount,
        splToken,
        reference: ref.publicKey.toBase58(),
        label: name,
        message: `${name} — ${terminalId}`,
      })

      setSolanaPayUrl(url.toString())
      setReferenceKey(ref.publicKey.toBase58())
      setCryptoAmount(tokenAmount)
      return { referenceKey: ref.publicKey, solanaPayUrl: url.toString(), cryptoAmount: tokenAmount, error: null }
    },
    [walletAddress, wallet, name, terminalId, stopWatching]
  )

  const startWatching = useCallback(
    (reference: PublicKey) => {
      stopWatching()
      setPaymentStatus("pending")

      watcherRef.current = watchForPayment(connection, reference, (status) => {
        if (status === "confirmed") {
          // Only flag the confirmation here — the POS page owns the success
          // modal and calls reset() when the merchant dismisses it. Resetting
          // state on a timer from inside this hook unmounted the modal
          // mid-animation.
          setPaymentStatus("confirmed")
          useMerchantStore.getState().incrementPayments(currentAmountRef.current)
          useTxStore.setState({ lastFetched: 0 })
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
    setCryptoAmount(null)
  }, [stopWatching])

  return {
    solanaPayUrl,
    referenceKey,
    paymentStatus,
    cryptoAmount,
    setPaymentStatus,
    generateUrl,
    startWatching,
    reset,
  }
}
