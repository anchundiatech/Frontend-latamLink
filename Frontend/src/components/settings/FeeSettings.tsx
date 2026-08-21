"use client"

import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { DistributionSlider } from "@/components/split-routing/DistributionSlider"

export function FeeSettings() {
  const { feeBps, setMerchant } = useMerchantStore()
  const feePercent = (feeBps / 100).toFixed(2)

  return (
    <div className="glass rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-heading text-on-surface mb-1">POS Fee</h3>
        <p className="text-xs text-on-surface-variant">
          Set the fee percentage charged per transaction
        </p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">Fee Rate</span>
        <span className="text-sm font-heading text-on-surface">{feePercent}%</span>
      </div>
      <DistributionSlider
        value={[feeBps]}
        onValueChange={([v]) => setMerchant({ feeBps: v })}
        max={500}
      />
      <div className="flex justify-between text-xs text-on-surface-variant">
        <span>0%</span>
        <span>5%</span>
      </div>
    </div>
  )
}
