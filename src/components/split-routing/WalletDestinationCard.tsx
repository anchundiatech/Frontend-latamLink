"use client"

import { Trash2 } from "lucide-react"
import { DistributionSlider } from "./DistributionSlider"
import { shortenAddress } from "@/lib/utils"

interface WalletDestinationCardProps {
  id: string
  label: string
  address: string
  percentage: number
  color: string
  onPercentageChange: (id: string, value: number) => void
  onRemove: (id: string) => void
}

export function WalletDestinationCard({
  id,
  label,
  address,
  percentage,
  color,
  onPercentageChange,
  onRemove,
}: WalletDestinationCardProps) {
  return (
    <div className="glass rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <div>
            <p className="text-sm font-heading text-on-surface">{label}</p>
            <p className="text-xs font-mono text-on-surface-variant truncate max-w-[200px]">
              {address ? shortenAddress(address, 6) : "No account set"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-heading text-on-surface">{percentage}%</span>
          <button
            onClick={() => onRemove(id)}
            aria-label={`Remove ${label}`}
            className="text-on-surface-variant hover:text-error transition-colors p-2 -m-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <DistributionSlider
        value={[percentage]}
        onValueChange={([v]) => onPercentageChange(id, v)}
      />
    </div>
  )
}
