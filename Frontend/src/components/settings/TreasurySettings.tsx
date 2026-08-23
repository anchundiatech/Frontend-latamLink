"use client"

import { useState } from "react"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { shortenAddress } from "@/lib/utils"
import { Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"

export function TreasurySettings() {
  const { destinations, removeDestination } = useMerchantStore()
  const [pendingRemoval, setPendingRemoval] = useState<{ id: string; label: string } | null>(null)

  const confirmRemoval = () => {
    if (!pendingRemoval) return
    removeDestination(pendingRemoval.id)
    setPendingRemoval(null)
  }

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
            className="flex items-center justify-between p-3 rounded-lg bg-white/2"
          >
            <div>
              <p className="text-sm text-on-surface">{dest.label}</p>
              <p className="text-xs font-mono text-on-surface-variant truncate max-w-62.5">
                {dest.address ? shortenAddress(dest.address, 6) : "No account set"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-heading text-on-surface">
                {dest.percentage}%
              </span>
              <button
                onClick={() => setPendingRemoval({ id: dest.id, label: dest.label })}
                aria-label={`Remove ${dest.label}`}
                className="text-on-surface-variant hover:text-error transition-colors p-2 -m-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title={`Remove ${pendingRemoval?.label ?? "this account"}?`}
        description="This account will stop receiving its share of future payments. This can't be undone from here — you'll need to add it again if you change your mind."
        confirmLabel="Remove account"
        onConfirm={confirmRemoval}
      />
    </div>
  )
}
