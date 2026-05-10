"use client"

import { useMerchantStore } from "@/lib/store/useMerchantStore"

export function TerminalSettings() {
  const { name, terminalId, minPaymentAmount, setMerchant } = useMerchantStore()

  return (
    <div className="glass rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-heading text-on-surface mb-1">
          Terminal Configuration
        </h3>
        <p className="text-xs text-on-surface-variant">
          Update your POS terminal details
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-on-surface-variant font-heading block mb-1">
            Business Name
          </label>
          <input
            value={name}
            onChange={(e) => setMerchant({ name: e.target.value })}
            className="w-full bg-surface-container-low border border-white/10 rounded-default px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-electric-purple/50"
          />
        </div>
        <div>
          <label className="text-xs text-on-surface-variant font-heading block mb-1">
            Terminal ID
          </label>
          <input
            value={terminalId}
            onChange={(e) => setMerchant({ terminalId: e.target.value })}
            className="w-full bg-surface-container-low border border-white/10 rounded-default px-3 py-2 text-sm text-on-surface font-mono focus:outline-none focus:border-electric-purple/50"
          />
        </div>
        <div>
          <label className="text-xs text-on-surface-variant font-heading block mb-1">
            Min Payment Amount (USD)
          </label>
          <input
            type="number"
            value={minPaymentAmount}
            onChange={(e) =>
              setMerchant({ minPaymentAmount: parseFloat(e.target.value) || 0 })
            }
            className="w-full bg-surface-container-low border border-white/10 rounded-default px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-electric-purple/50"
          />
        </div>
      </div>
    </div>
  )
}
