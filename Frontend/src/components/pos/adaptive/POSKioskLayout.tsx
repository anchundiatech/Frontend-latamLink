"use client"

import { useCallback, useRef, useState } from "react"
import { Clock } from "lucide-react"
import { AmountDisplay } from "@/components/pos/amount/AmountDisplay"
import { POSKeypad } from "@/components/pos/amount/POSKeypad"
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
      className="fixed inset-0 flex flex-col items-center justify-center bg-background px-8 py-6"
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

      {c.step === "input" ? (
        <div className="flex flex-col items-center space-y-10">
          <AmountDisplay amount={c.amount} minAmount={c.minPaymentAmount} size="large" />
          <POSKeypad amount={c.amount} onAmountChange={c.setAmount} size="large" />
          <POSActionButton
            onClick={c.handleGenerateQR}
            disabled={!c.amount || parseFloat(c.amount) <= 0 || c.converting}
            loading={c.converting}
            loadingLabel="Getting exchange rate..."
            label="Generate Payment QR"
            className="max-w-md py-6 text-base"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-8">
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
            className={`text-xs font-heading transition-colors px-4 py-2 rounded-default ${
              holding ? "text-error bg-error/10" : "text-on-surface-variant"
            }`}
          >
            {holding ? "Hold to cancel..." : "Hold to cancel payment"}
          </button>
        </div>
      )}
    </div>
  )
}
