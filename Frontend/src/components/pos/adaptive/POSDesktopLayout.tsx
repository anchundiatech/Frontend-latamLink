"use client"

import { Clock, X, Wifi, WifiOff, Maximize, Activity, CircleDashed, Globe, Coins } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AmountDisplay } from "@/components/pos/amount/AmountDisplay"
import { POSKeypad } from "@/components/pos/amount/POSKeypad"
import { ConceptInput } from "@/components/pos/amount/ConceptInput"
import { TokenSelector } from "@/components/pos/TokenSelector"
import { POSActionButton } from "@/components/pos/shared/POSActionButton"
import { PaymentQRCode } from "@/components/pos/payment/PaymentQRCode"
import { TerminalHeader } from "@/components/pos/terminal/TerminalHeader"
import { TerminalStatus } from "@/components/pos/terminal/TerminalStatus"
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus"
import { config } from "@/lib/config"
import type { POSController } from "@/lib/services/usePOSController"

interface POSDesktopLayoutProps {
  controller: POSController
  onBack: () => void
  onEnterKiosk: () => void
}

// Vista simultánea: monto, keypad, QR, estado, terminal, conexión e info de
// transacción a la vez — el escritorio tiene espacio de sobra, no hace falta
// alternar entre pasos.
export function POSDesktopLayout({ controller, onBack, onEnterKiosk }: POSDesktopLayoutProps) {
  const c = controller
  const online = useOnlineStatus()

  return (
    <div className="max-w-6xl mx-auto">
      <TerminalHeader showBack={c.step === "qr"} onBack={onBack} />

      <div className="glass-strong rounded-xl p-8">
        <div className="flex items-center justify-between mb-8">
          <TokenSelector selected={c.token} onSelect={c.setToken} />
          <div className="flex items-center gap-4">
            <TerminalStatus isActive={c.terminalActive} />
            <button
              onClick={onEnterKiosk}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <Maximize className="w-3 h-3" />
              Kiosk mode
            </button>
          </div>
        </div>

        {c.noWallet && (
          <div className="mb-6 p-3 glass rounded-lg border border-warning/20 text-center">
            <p className="text-xs text-warning font-heading">
              Estamos preparando tu cuenta de pago. Esperá unos segundos.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-10">
          <div className="flex flex-col items-center space-y-4">
            <AmountDisplay amount={c.amount} minAmount={c.minPaymentAmount} />
            {c.step === "input" && (
              <ConceptInput value={c.concept} onChange={c.setConcept} />
            )}
            <POSKeypad amount={c.amount} onAmountChange={c.setAmount} />
            <POSActionButton
              onClick={c.handleGenerateQR}
              disabled={!c.amount || parseFloat(c.amount) <= 0 || c.converting || !c.online}
              loading={c.converting}
              loadingLabel="Getting exchange rate..."
              label="Generate Payment QR"
            />
          </div>

          <div className="flex flex-col items-center justify-center">
            {c.step === "qr" && c.solanaPayUrl ? (
              <PaymentQRCode
                amount={c.amount}
                token={c.token}
                cryptoAmount={c.cryptoAmount}
                solanaPayUrl={c.solanaPayUrl}
                recipientAddress={c.recipientAddress}
              />
            ) : (
              <p className="text-sm text-on-surface-variant text-center">
                Your payment QR will appear here.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-electric-purple/10 flex items-center justify-center shrink-0">
                  <Activity className="w-3.5 h-3.5 text-electric-purple" />
                </div>
                <p className="text-xs text-on-surface-variant font-heading uppercase tracking-wider">
                  Payment Status
                </p>
              </div>

              <AnimatePresence mode="wait">
                {c.step === "qr" ? (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {c.paymentStatus === "pending" && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-heading text-warning bg-warning/10 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                        Waiting for payment
                      </span>
                    )}
                    {c.secondsLeft !== null && (
                      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <Clock className="w-3 h-3" />
                        <span>
                          Expires in {Math.floor(c.secondsLeft / 60)}:{String(c.secondsLeft % 60).padStart(2, "0")}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={c.handleCancel}
                      className="inline-flex items-center gap-1.5 text-xs font-heading text-error bg-error/10 hover:bg-error/20 transition-colors px-2.5 py-1.5 rounded-lg cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      Cancel payment
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 text-on-surface-variant"
                  >
                    <CircleDashed className="w-3.5 h-3.5" />
                    <p className="text-xs">No active payment</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    online ? "bg-success/10" : "bg-error/10"
                  }`}
                >
                  {online ? (
                    <Wifi className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-error" />
                  )}
                </div>
                <p className="text-xs text-on-surface-variant font-heading uppercase tracking-wider">
                  Connection
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-heading px-2.5 py-1 rounded-full ${
                  online ? "text-success bg-success/10" : "text-error bg-error/10"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-success animate-pulse" : "bg-error"}`} />
                {online ? "Connected" : "Offline"}
              </span>
            </div>

            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-electric-teal/10 flex items-center justify-center shrink-0">
                  <Globe className="w-3.5 h-3.5 text-electric-teal" />
                </div>
                <p className="text-xs text-on-surface-variant font-heading uppercase tracking-wider">
                  Transaction Info
                </p>
              </div>
              <dl className="text-xs space-y-2.5">
                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <dt className="flex items-center gap-1.5 text-on-surface-variant">
                    <Globe className="w-3 h-3" />
                    Network
                  </dt>
                  <dd className="text-on-surface font-heading capitalize">{config.cluster}</dd>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <dt className="flex items-center gap-1.5 text-on-surface-variant">
                    <Coins className="w-3 h-3" />
                    Token
                  </dt>
                  <dd className="text-on-surface font-heading uppercase">{c.token}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
