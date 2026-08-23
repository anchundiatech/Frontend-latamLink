"use client"

import { Clock, X } from "lucide-react"
import { AmountDisplay } from "@/components/pos/amount/AmountDisplay"
import { POSKeypad } from "@/components/pos/amount/POSKeypad"
import { ConceptInput } from "@/components/pos/amount/ConceptInput"
import { TokenSelector } from "@/components/pos/TokenSelector"
import { POSActionButton } from "@/components/pos/shared/POSActionButton"
import { PaymentQRCode } from "@/components/pos/payment/PaymentQRCode"
import { TerminalHeader } from "@/components/pos/terminal/TerminalHeader"
import { TerminalStatus } from "@/components/pos/terminal/TerminalStatus"
import type { POSController } from "@/lib/services/usePOSController"

interface POSTabletLayoutProps {
  controller: POSController
  onBack: () => void
}

// Dos columnas: monto+keypad a la izquierda, QR+estado a la derecha.
// Funciona igual en portrait y landscape — el ancho disponible en tablet ya
// alcanza para las dos columnas en cualquier orientación.
export function POSTabletLayout({ controller, onBack }: POSTabletLayoutProps) {
  const c = controller

  return (
    <div className="max-w-4xl mx-auto">
      <TerminalHeader showBack={c.step === "qr"} onBack={onBack} />

      <div className="glass-strong rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <TokenSelector selected={c.token} onSelect={c.setToken} />
          <TerminalStatus isActive={c.terminalActive} />
        </div>

        {c.noWallet && (
          <div className="mb-6 p-3 glass rounded-lg border border-warning/20 text-center">
            <p className="text-xs text-warning font-heading">
              Estamos preparando tu cuenta de pago. Esperá unos segundos.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <AmountDisplay amount={c.amount} minAmount={c.minPaymentAmount} />
            {c.step === "input" && (
              <ConceptInput value={c.concept} onChange={c.setConcept} />
            )}
            <POSKeypad amount={c.amount} onAmountChange={c.setAmount} />
            {c.step === "input" && (
              <POSActionButton
                onClick={c.handleGenerateQR}
                disabled={!c.amount || parseFloat(c.amount) <= 0 || c.converting || !c.online}
                loading={c.converting}
                loadingLabel="Getting exchange rate..."
                label="Generate Payment QR"
              />
            )}
          </div>

          <div className="flex flex-col items-center justify-center">
            {c.step === "qr" ? (
              <>
                <PaymentQRCode
                  amount={c.amount}
                  token={c.token}
                  cryptoAmount={c.cryptoAmount}
                  solanaPayUrl={c.solanaPayUrl}
                  recipientAddress={c.recipientAddress}
                />
                <div className="mt-6 p-4 glass rounded-xl text-center space-y-3 w-full">
                  {c.paymentStatus === "pending" ? (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-electric-purple border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-on-surface-variant">
                          Waiting for the customer&apos;s payment...
                        </p>
                      </div>
                      {c.secondsLeft !== null && (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-on-surface-variant">
                          <Clock className="w-3 h-3" />
                          <span>
                            Expires in {Math.floor(c.secondsLeft / 60)}:{String(c.secondsLeft % 60).padStart(2, "0")}
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
                    onClick={c.handleCancel}
                    className="inline-flex items-center gap-1.5 text-xs font-heading text-on-surface-variant hover:text-error transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Cancel payment
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant text-center">
                Your payment QR will appear here.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
