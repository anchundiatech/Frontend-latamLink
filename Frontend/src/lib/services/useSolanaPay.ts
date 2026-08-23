"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { PublicKey, Connection } from "@solana/web3.js"
import { encodeURL } from "@solana/pay"
import type { Address } from "@solana/kit"
import { generateReferenceKey, watchForPayment } from "./solanaPay"
import { fetchBackendConfig } from "./useBackendConfig"
import { convertUsdToToken, getSolUsdPrice } from "./priceFeed"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useTxStore } from "@/lib/store/useTxStore"
import { config } from "@/lib/config"
import type { PaymentStatus } from "@/lib/payments/paymentStatus"

const connection = new Connection(config.rpcEndpoint, "confirmed")

export function useSolanaPay() {
  const { name, merchantPda, walletAddress } = useMerchantStore()
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
    async (usdAmount: number, token: "usdc" | "sol", concept?: string) => {
      currentAmountRef.current = usdAmount
      stopWatching()
      setPaymentStatus("idle")
      setCryptoAmount(null)

      // El cobro se arma contra el comercio on-chain: sin él no hay reparto
      // posible, así que no se genera un QR que cobraría de más y repartiría
      // de menos.
      if (!merchantPda || !walletAddress) {
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

      if (token === "usdc" && !config.paymentTokenMint) {
        return {
          referenceKey: null as unknown as PublicKey,
          solanaPayUrl: null,
          cryptoAmount: null,
          error: "config_unavailable" as const,
        }
      }

      const ref = generateReferenceKey()

      // El cobro on-chain siempre se hace en el token configurado en el
      // backend (hoy un stablecoin): elegir "Solana" acá no cambia qué token
      // se mueve, solo le muestra al comercio a cuánto SOL equivale el monto
      // en moneda local, a título informativo.
      let cryptoEquivalent = usdAmount
      if (token === "sol") {
        try {
          const solPrice = await getSolUsdPrice()
          cryptoEquivalent = convertUsdToToken(usdAmount, solPrice)
        } catch {
          // Sin cotización no se bloquea el cobro: se sigue mostrando el
          // monto en moneda local nada más.
        }
      }

      // QR de transferencia directa (Solana Pay "transfer request"), armado
      // con el SDK oficial: las wallets móviles no reconocen de forma
      // confiable el patrón "transaction request" (el link a /api/pay) al
      // escanear con la cámara, así que el cliente paga directo a la wallet
      // del comercio. Esto sacrifica el reparto automático entre varios
      // destinos — solo alcanza a la wallet del comercio, no a un split de
      // varias cuentas — hasta que se arme una página de checkout con
      // wallet-adapter que sí soporte ese flujo.
      const url = encodeURL({
        recipient: walletAddress as Address,
        amount: cryptoEquivalent,
        splToken: token === "usdc" ? (config.paymentTokenMint as Address) : undefined,
        reference: ref.publicKey.toBase58() as Address,
        label: name || "LatamLink Pay",
        message: concept ? `${name || "LatamLink Pay"} — ${concept}` : `${name || "LatamLink Pay"} — cobro`,
      }).toString()

      setSolanaPayUrl(url)
      setReferenceKey(ref.publicKey.toBase58())
      setCryptoAmount(cryptoEquivalent)
      return {
        referenceKey: ref.publicKey,
        solanaPayUrl: url,
        cryptoAmount: cryptoEquivalent,
        error: null,
      }
    },
    [merchantPda, walletAddress, name, stopWatching]
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
          useMerchantStore.getState().incrementPayments(currentAmountRef.current)
          useTxStore.setState({ lastFetched: 0 })
        }
        setPaymentStatus(status)
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
