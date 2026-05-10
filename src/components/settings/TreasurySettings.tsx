"use client"

import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { Trash2 } from "lucide-react"

export function TreasurySettings() {
  const { destinations, removeDestination } = useMerchantStore()

  return (
    <div className="glass rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-heading text-on-surface mb-1">
          Treasury Accounts
        </h3>
        <p className="text-xs text-on-surface-variant">
          Manage your revenue distribution accounts
        </p>
      </div>
      <div className="space-y-2">
        {destinations.map((dest) => (
          <div
            key={dest.id}
            className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]"
          >
            <div>
              <p className="text-sm text-on-surface">{dest.label}</p>
              <p className="text-xs font-mono text-on-surface-variant truncate max-w-[250px]">
                {dest.address}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-heading text-on-surface">
                {dest.percentage}%
              </span>
              <button
                onClick={() => removeDestination(dest.id)}
                className="text-on-surface-variant hover:text-error transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
