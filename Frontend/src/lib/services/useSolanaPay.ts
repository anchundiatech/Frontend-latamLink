"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { PublicKey, Connection } from "@solana/web3.js"
import { generateReferenceKey, watchForPayment } from "./solanaPay"
import { fetchBackendConfig, toMinimalUnits } from "./useBackendConfig"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useTxStore } from "@/lib/store/useTxStore"
import { config } from "@/lib/config"
import type { PaymentStatus } from "@/lib/payments/paymentStatus"

const connection = new Connection(config.rpcEndpoint, "confirmed")

export function useSolanaPay() {
  const { name, merchantPda } = useMerchantStore()
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle")
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
    async (usdAmount: number, _token: "usdc" | "sol") => {
      currentAmountRef.current = usdAmount
      stopWatching()
      setPaymentStatus("idle")
      setCryptoAmount(null)

      // El cobro se arma contra el comercio on-chain: sin él no hay reparto
      // posible, así que no se genera un QR que cobraría de más y repartiría
      // de menos.
      if (!merchantPda) {
        return {
          referenceKey: null as unknown as PublicKey,
          solanaPayUrl: null,
          cryptoAmount: null,
          error: "merchant_not_created" as const,
        }
      }

      let config
      try {
        config = await fetchBackendConfig()
      } catch {
        return {
          referenceKey: null as unknown as PublicKey,
          solanaPayUrl: null,
          cryptoAmount: null,
          error: "config_unavailable" as const,
        }
      }

      const ref = generateReferenceKey()

      // El QR apunta a nuestro endpoint (Solana Pay, "transaction request") en
      // vez de codificar una transferencia suelta: así el pago ejecuta `pay()`
      // y conserva el split y las comisiones. La billetera recibe la
      // transacción ya firmada por el relayer, que paga el fee de red.
      const requestUrl = new URL("/api/pay", window.location.origin)
      requestUrl.searchParams.set("merchant", merchantPda)
      requestUrl.searchParams.set("amount", toMinimalUnits(usdAmount, config.tokenDecimals))
      requestUrl.searchParams.set("reference", ref.publicKey.toBase58())
      requestUrl.searchParams.set("label", name || "LatamLink Pay")

      const url = `solana:${encodeURIComponent(requestUrl.toString())}`

      setSolanaPayUrl(url)
      setReferenceKey(ref.publicKey.toBase58())
      setCryptoAmount(usdAmount)
      return {
        referenceKey: ref.publicKey,
        solanaPayUrl: url,
        cryptoAmount: usdAmount,
        error: null,
      }
    },
    [merchantPda, name, stopWatching]
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
