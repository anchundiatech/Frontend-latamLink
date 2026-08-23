"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Clock, X } from "lucide-react"
import { AmountInput } from "@/components/pos/amount/AmountInput"
import { TokenSelector } from "@/components/pos/TokenSelector"
import { PaymentQRCode } from "@/components/pos/payment/PaymentQRCode"
import { TerminalHeader } from "@/components/pos/terminal/TerminalHeader"
import { TerminalStatus } from "@/components/pos/terminal/TerminalStatus"
import type { POSController } from "@/lib/services/usePOSController"

interface POSMobileLayoutProps {
  controller: POSController
  onBack: () => void
}

// Prioridad mobile: monto → keypad → botón cobrar → QR → estado, sin scroll
// vertical. Un solo panel visible a la vez.
export function POSMobileLayout({ controller, onBack }: POSMobileLayoutProps) {
  const c = controller

  return (
    <div className="max-w-2xl mx-auto">
      <TerminalHeader showBack={c.step === "qr"} onBack={onBack} />

      <div className="glass-strong rounded-xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8">
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

        <AnimatePresence mode="wait">
          {c.step === "input" ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <AmountInput
                amount={c.amount}
                onAmountChange={c.setAmount}
                concept={c.concept}
                onConceptChange={c.setConcept}
                onSubmit={c.handleGenerateQR}
                submitting={c.converting}
                minAmount={c.minPaymentAmount}
              />
            </motion.div>
          ) : (
            <motion.div
              key="qr"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PaymentQRCode
                amount={c.amount}
                token={c.token}
                cryptoAmount={c.cryptoAmount}
                solanaPayUrl={c.solanaPayUrl}
                recipientAddress={c.recipientAddress}
              />
              <div className="mt-6 p-4 glass rounded-xl text-center space-y-3">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
