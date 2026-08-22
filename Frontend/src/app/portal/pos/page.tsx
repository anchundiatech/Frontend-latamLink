/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AmountInput } from "@/components/pos/AmountInput"
import { TokenSelector } from "@/components/pos/TokenSelector"
import { QRCodeDisplay } from "@/components/pos/QRCodeDisplay"
import { PaymentStatus } from "@/components/pos/PaymentStatus"
import { PaymentSuccessAnimation } from "@/components/pos/PaymentSuccessAnimation"
import { ArrowLeft, Clock, X } from "lucide-react"
import { toast } from "sonner"
import { useCuentaDePago } from "@/lib/services/useCuentaDePago"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { Logo } from "@/components/Logo"
import { useSolanaPay } from "@/lib/services/useSolanaPay"
import { PAYMENT_WATCH_TIMEOUT_MS } from "@/lib/payments/paymentStatus"

export default function POSPage() {
  const [amount, setAmount] = useState("")
  const [token, setToken] = useState<"usdc" | "sol">("usdc")
  const [step, setStep] = useState<"input" | "qr">("input")
  const [converting, setConverting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const { walletAddress, setWalletAddress, name, minPaymentAmount } = useMerchantStore()
  const cuentaDePago = useCuentaDePago()
  const { solanaPayUrl, cryptoAmount, paymentStatus, generateUrl, startWatching, reset } = useSolanaPay()
  const walletConnected = !!(walletAddress || cuentaDePago)
  const noWallet = !walletConnected

  const handleGenerateQR = useCallback(async () => {
    if (amount && parseFloat(amount) > 0) {
      if (cuentaDePago && !walletAddress) {
        setWalletAddress(cuentaDePago)
      }
      setConverting(true)
      const result = await generateUrl(parseFloat(amount), token)
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
    }
  }, [amount, token, cuentaDePago, walletAddress, setWalletAddress, generateUrl, startWatching])

  const handleSuccessDone = useCallback(() => {
    setStep("input")
    setAmount("")
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

  const recipientAddress = walletAddress || cuentaDePago || ""

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
    
        <div>
          <h1 className="text-headline-lg font-heading text-on-surface">
            POS Terminal
          </h1>
          <p className="text-xs text-on-surface-variant">
            Accept instant payments
          </p>
        </div>
        {step === "qr" && (
          <button
            onClick={() => { setStep("input"); reset() }}
            className="ml-auto flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
        )}
      </div>

      <div className="glass-strong rounded-xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <TokenSelector selected={token} onSelect={setToken} />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-success font-heading">Live</span>
          </div>
        </div>

        {noWallet && (
          <div className="mb-6 p-3 glass rounded-lg border border-warning/20 text-center">
            <p className="text-xs text-warning font-heading">
              Estamos preparando tu cuenta de pago. Esperá unos segundos.
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === "input" ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <AmountInput
                amount={amount}
                onAmountChange={setAmount}
                onSubmit={handleGenerateQR}
                submitting={converting}
                minAmount={minPaymentAmount}
              />
            </motion.div>
          ) : (
            <motion.div
              key="qr"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <QRCodeDisplay
                amount={amount}
                token={token}
                cryptoAmount={cryptoAmount}
                solanaPayUrl={solanaPayUrl}
                recipientAddress={recipientAddress}
              />
              <div className="mt-6 p-4 glass rounded-xl text-center space-y-3">
                {paymentStatus === "pending" ? (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-electric-purple border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-on-surface-variant">
                        Waiting for the customer&apos;s payment...
                      </p>
                    </div>
                    {secondsLeft !== null && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-on-surface-variant">
                        <Clock className="w-3 h-3" />
                        <span>
                          Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-on-surface-variant">
                    Customer scans this QR with their phone to pay.
                  </p>
                )}
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 text-xs font-heading text-on-surface-variant hover:text-error transition-colors"
                >
                  <X className="w-3 h-3" />
                  Cancel payment
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PaymentStatus
        status={paymentStatus}
        onRetry={() => {
          reset()
          setStep("input")
        }}
      />
      {paymentStatus === "confirmed" && (
        <PaymentSuccessAnimation onDone={handleSuccessDone} />
      )}
    </div>
  )
}
