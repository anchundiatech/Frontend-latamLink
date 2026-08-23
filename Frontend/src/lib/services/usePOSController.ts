/* eslint-disable react-hooks/set-state-in-effect -- countdown timer synced to step/paymentStatus, not derivable at render */
"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useCuentaDePago } from "@/lib/services/useCuentaDePago"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useSolanaPay } from "@/lib/services/useSolanaPay"
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus"
import { PAYMENT_WATCH_TIMEOUT_MS } from "@/lib/payments/paymentStatus"

export type POSStep = "input" | "qr"

/**
 * Orquestador único del POS: monto, token, flujo de pago, timer y estado de
 * wallet/terminal. Device-agnostic a propósito — AdaptivePOSLayout y sus
 * variantes solo deciden cómo se presenta este mismo estado, nunca lo
 * duplican.
 */
export function usePOSController() {
  const [amount, setAmount] = useState("")
  const [concept, setConcept] = useState("")
  const [token, setToken] = useState<"usdc" | "sol">("usdc")
  const [step, setStep] = useState<POSStep>("input")
  const [converting, setConverting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  const { walletAddress, setWalletAddress, name, isActive, minPaymentAmount } = useMerchantStore()
  const cuentaDePago = useCuentaDePago()
  const { solanaPayUrl, cryptoAmount, paymentStatus, generateUrl, startWatching, reset } = useSolanaPay()
  const online = useOnlineStatus()

  const walletConnected = !!(walletAddress || cuentaDePago)
  const noWallet = !walletConnected
  const recipientAddress = walletAddress || cuentaDePago || ""

  const handleGenerateQR = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return

    // Sin conexión no hay forma de verificar un pago en Solana: no tiene
    // sentido generar un QR que el POS no podría confirmar igual.
    if (!online) {
      toast.error("Sin conexión a internet. Reconectate para generar el cobro.")
      return
    }

    if (cuentaDePago && !walletAddress) {
      setWalletAddress(cuentaDePago)
    }
    setConverting(true)
    const result = await generateUrl(parseFloat(amount), token, concept.trim())
    setConverting(false)

    if (result.error === "merchant_not_created") {
      toast.error(
        "Configurá primero el reparto de tu comercio: el cobro se ejecuta contra el contrato."
      )
      return
    }
    if (result.error === "config_unavailable") {
      toast.error("No se pudo contactar con el servicio de pagos. Probá de nuevo.")
      return
    }
    if (!result.solanaPayUrl) return

    setStep("qr")
    startWatching(result.referenceKey)
  }, [amount, concept, token, online, cuentaDePago, walletAddress, setWalletAddress, generateUrl, startWatching])

  const handleSuccessDone = useCallback(() => {
    setStep("input")
    setAmount("")
    setConcept("")
    reset()
  }, [reset])

  const handleCancel = useCallback(() => {
    reset()
    setStep("input")
  }, [reset])

  // This countdown mirrors the payment watcher's timeout window so the
  // merchant can see it (PAYMENT_WATCH_TIMEOUT_MS is the single source of
  // truth shared with the watcher itself).
  useEffect(() => {
    if (step !== "qr" || paymentStatus !== "pending") {
      setSecondsLeft(null)
      return
    }
    setSecondsLeft(PAYMENT_WATCH_TIMEOUT_MS / 1000)
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s !== null && s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [step, paymentStatus])

  return {
    // amount
    amount,
    setAmount,
    concept,
    setConcept,
    minPaymentAmount,
    // token
    token,
    setToken,
    // flow
    step,
    converting,
    secondsLeft,
    solanaPayUrl,
    cryptoAmount,
    paymentStatus,
    recipientAddress,
    handleGenerateQR,
    handleSuccessDone,
    handleCancel,
    online,
    // terminal / wallet
    terminalName: name,
    terminalActive: isActive,
    noWallet,
  }
}

export type POSController = ReturnType<typeof usePOSController>
