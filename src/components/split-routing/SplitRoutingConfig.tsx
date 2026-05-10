"use client"

import { useState } from "react"
import { Plus, Save, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { WalletDestinationCard } from "./WalletDestinationCard"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useUpdateConfig } from "@/lib/anchor/useAnchorProgram"

const cardColors = ["#a855f7", "#2dd4bf", "#adc6ff"]

export function SplitRoutingConfig() {
  const { destinations, addDestination, removeDestination, updateDestination } =
    useMerchantStore()
  const [newLabel, setNewLabel] = useState("")
  const [newAddress, setNewAddress] = useState("")

  const { update } = useUpdateConfig()
  const [saving, setSaving] = useState(false)

  const totalPercentage = destinations.reduce(
    (sum, d) => sum + d.percentage,
    0
  )

  const handleAdd = () => {
    if (!newLabel.trim() || !newAddress.trim()) {
      toast.error("Please fill in both label and address")
      return
    }
    if (destinations.length >= 10) {
      toast.error("Maximum 10 destinations allowed")
      return
    }
    addDestination({
      id: String(Date.now()),
      label: newLabel.trim(),
      address: newAddress.trim(),
      percentage: 0,
    })
    setNewLabel("")
    setNewAddress("")
    toast.success("Recipient added")
  }

  const handlePercentageChange = (id: string, value: number) => {
    updateDestination(id, { percentage: value })
  }

  const handleSave = async () => {
    if (totalPercentage !== 100) {
      toast.error(`Total must be 100%. Currently: ${totalPercentage}%`)
      return
    }
    setSaving(true)
    await update()
    setSaving(false)
    toast.success("Split routing configuration saved!")
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-heading text-on-surface">Recipients</h3>
          <span
            className={`text-xs font-heading ${
              totalPercentage === 100
                ? "text-success"
                : totalPercentage > 100
                  ? "text-error"
                  : "text-warning"
            }`}
          >
            {totalPercentage}% / 100%
          </span>
        </div>

        <div className="space-y-3">
          {destinations.map((dest, i) => (
            <WalletDestinationCard
              key={dest.id}
              {...dest}
              color={cardColors[i % cardColors.length]}
              onPercentageChange={handlePercentageChange}
              onRemove={removeDestination}
            />
          ))}
        </div>

        <div className="mt-4 p-4 rounded-lg bg-white/2 space-y-3">
          <p className="text-xs font-heading text-on-surface-variant uppercase tracking-wider">
            Add Recipient
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label"
              className="bg-surface-container-low border border-white/10 rounded-default px-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-electric-purple/50"
            />
            <input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Account address"
              className="sm:col-span-1 bg-surface-container-low border border-white/10 rounded-default px-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-electric-purple/50 font-mono"
            />
            <button
              onClick={handleAdd}
              className="flex items-center justify-center gap-1.5 bg-surface-container-highest hover:bg-surface-container-high text-on-surface rounded-default px-3 py-2 text-xs font-heading transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={totalPercentage !== 100 || saving}
        className="w-full bg-electric-purple hover:bg-electric-purple/90 disabled:opacity-30 disabled:cursor-not-allowed text-white font-heading font-medium py-3 rounded-default transition-all duration-200 text-sm flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Saving..." : "Save Configuration"}
      </button>
    </div>
  )
}
