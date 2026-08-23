"use client"

import { useCallback, useRef, useState } from "react"
import { Clock, XCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AmountDisplay } from "@/components/pos/amount/AmountDisplay"
import { POSKeypad } from "@/components/pos/amount/POSKeypad"
import { ConceptInput } from "@/components/pos/amount/ConceptInput"
import { POSActionButton } from "@/components/pos/shared/POSActionButton"
import { PaymentQRCode } from "@/components/pos/payment/PaymentQRCode"
import { TerminalStatus } from "@/components/pos/terminal/TerminalStatus"
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus"
import type { POSController } from "@/lib/services/usePOSController"

const HOLD_TO_CANCEL_MS = 2000

interface POSKioskLayoutProps {
  controller: POSController
  onExitKiosk: () => void
}

// Fullscreen, controles y QR grandes, navegación mínima. Un dispositivo fijo
// desatendido no debe cancelar un cobro por un toque accidental: cancelar
// exige mantener presionado, no un tap simple.
export function POSKioskLayout({ controller, onExitKiosk }: POSKioskLayoutProps) {
  const c = controller
  const online = useOnlineStatus()
  const [holding, setHolding] = useState(false)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startHold = useCallback(() => {
    setHolding(true)
    holdTimer.current = setTimeout(() => {
      setHolding(false)
      c.handleCancel()
    }, HOLD_TO_CANCEL_MS)
  }, [c])

  const cancelHold = useCallback(() => {
    setHolding(false)
    if (holdTimer.current) clearTimeout(holdTimer.current)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-8 py-6"
      style={{ height: "100dvh" }}
    >
      <div className="absolute top-6 left-8 right-8 flex items-center justify-between">
        <TerminalStatus isActive={c.terminalActive} />
        {!online && (
          <span className="text-xs text-error font-heading">No internet connection</span>
        )}
        <button
          onClick={onExitKiosk}
          className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Exit kiosk
        </button>
      </div>

      <AnimatePresence mode="wait">
        {c.step === "input" ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center space-y-6"
          >
            <AmountDisplay amount={c.amount} minAmount={c.minPaymentAmount} size="large" />
            <ConceptInput value={c.concept} onChange={c.setConcept} size="large" />
            <POSKeypad amount={c.amount} onAmountChange={c.setAmount} size="large" />
            <POSActionButton
              onClick={c.handleGenerateQR}
              disabled={!c.amount || parseFloat(c.amount) <= 0 || c.converting || !c.online}
              loading={c.converting}
              loadingLabel="Getting exchange rate..."
              label="Generate Payment QR"
              className="max-w-md py-6 text-base"
            />
          </motion.div>
        ) : (
          <motion.div
            key="qr"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center space-y-8"
          >
            <PaymentQRCode
              amount={c.amount}
              token={c.token}
              cryptoAmount={c.cryptoAmount}
              solanaPayUrl={c.solanaPayUrl}
              recipientAddress={c.recipientAddress}
              size={320}
            />
            {c.paymentStatus === "pending" && c.secondsLeft !== null && (
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <Clock className="w-4 h-4" />
                <span>
                  Expires in {Math.floor(c.secondsLeft / 60)}:{String(c.secondsLeft % 60).padStart(2, "0")}
                </span>
              </div>
            )}
            <button
              onPointerDown={startHold}
              onPointerUp={cancelHold}
              onPointerLeave={cancelHold}
              className="relative overflow-hidden select-none text-xs font-heading px-5 py-2.5 rounded-full border border-white/10 cursor-pointer"
            >
              <motion.div
                className="absolute inset-0 bg-error/25"
                style={{ originX: 0 }}
                initial={false}
                animate={{ scaleX: holding ? 1 : 0 }}
                transition={{ duration: holding ? HOLD_TO_CANCEL_MS / 1000 : 0.15, ease: "linear" }}
              />
              <span
                className={`relative flex items-center gap-2 transition-colors ${
                  holding ? "text-error" : "text-on-surface-variant"
                }`}
              >
                <motion.span
                  className="flex"
                  animate={{ scale: holding ? [1, 1.15, 1] : 1 }}
                  transition={{ duration: 0.6, repeat: holding ? Infinity : 0 }}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </motion.span>
                {holding ? "Keep holding to cancel…" : "Hold to cancel payment"}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
