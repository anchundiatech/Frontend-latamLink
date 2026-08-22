"use client"

import { Clock, X, Wifi, Maximize } from "lucide-react"
import { AmountDisplay } from "@/components/pos/amount/AmountDisplay"
import { POSKeypad } from "@/components/pos/amount/POSKeypad"
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
      <div className="flex items-start justify-between">
        <TerminalHeader showBack={c.step === "qr"} onBack={onBack} />
        <button
          onClick={onEnterKiosk}
          className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors mt-1"
        >
          <Maximize className="w-3 h-3" />
          Kiosk mode
        </button>
      </div>

      <div className="glass-strong rounded-xl p-8">
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

        <div className="grid grid-cols-3 gap-10">
          <div className="flex flex-col items-center space-y-6">
            <AmountDisplay amount={c.amount} minAmount={c.minPaymentAmount} />
            <POSKeypad amount={c.amount} onAmountChange={c.setAmount} />
            <POSActionButton
              onClick={c.handleGenerateQR}
              disabled={!c.amount || parseFloat(c.amount) <= 0 || c.converting}
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
              <p className="text-xs text-on-surface-variant font-heading uppercase tracking-wider mb-2">
                Payment Status
              </p>
              {c.step === "qr" ? (
                <div className="space-y-2">
                  {c.paymentStatus === "pending" && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-electric-purple border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-on-surface-variant">
                        Waiting for the customer&apos;s payment...
                      </p>
                    </div>
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
                    className="inline-flex items-center gap-1.5 text-xs font-heading text-on-surface-variant hover:text-error transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Cancel payment
                  </button>
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant">No active payment.</p>
              )}
            </div>

            <div className="glass rounded-xl p-4">
              <p className="text-xs text-on-surface-variant font-heading uppercase tracking-wider mb-2">
                Connection
              </p>
              <div className="flex items-center gap-2">
                <Wifi className={`w-4 h-4 ${online ? "text-success" : "text-error"}`} />
                <span className={`text-xs font-heading ${online ? "text-success" : "text-error"}`}>
                  {online ? "Connected" : "Offline"}
                </span>
              </div>
            </div>

            <div className="glass rounded-xl p-4">
              <p className="text-xs text-on-surface-variant font-heading uppercase tracking-wider mb-2">
                Transaction Info
              </p>
              <dl className="text-xs text-on-surface-variant space-y-1">
                <div className="flex justify-between">
                  <dt>Network</dt>
                  <dd className="text-on-surface capitalize">{config.cluster}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Token</dt>
                  <dd className="text-on-surface uppercase">{c.token}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
