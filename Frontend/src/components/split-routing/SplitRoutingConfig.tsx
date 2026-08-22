"use client"

import { useState } from "react"
import { Plus, Save, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { PublicKey } from "@solana/web3.js"
import { WalletDestinationCard } from "./WalletDestinationCard"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useCreateMerchant } from "@/lib/services/useCreateMerchant"
import { useWalletsVinculadas } from "@/lib/services/useWalletsVinculadas"
import { useUpdateMerchantConfig } from "@/lib/services/useUpdateMerchantConfig"

const cardColors = ["#a855f7", "#2dd4bf", "#adc6ff"]

export function SplitRoutingConfig() {
  const { destinations, merchantPda, addDestination, removeDestination, updateDestination } =
    useMerchantStore()
  const [newLabel, setNewLabel] = useState("")
  const [newAddress, setNewAddress] = useState("")

  const { update } = useUpdateMerchantConfig()
  const { create } = useCreateMerchant()
  const { wallets } = useWalletsVinculadas()
  const [saving, setSaving] = useState(false)

  const totalPercentage = destinations.reduce(
    (sum, d) => sum + d.percentage,
    0
  )

  const handleAdd = () => {
    const label = newLabel.trim()
    const address = newAddress.trim()

    if (!label || !address) {
      toast.error("Please fill in both label and address")
      return
    }
    if (destinations.length >= 10) {
      toast.error("Maximum 10 destinations allowed")
      return
    }
    try {
      new PublicKey(address)
    } catch {
      toast.error("That doesn't look like a valid account address")
      return
    }
    if (destinations.some((d) => d.address === address)) {
      toast.error("That account is already added")
      return
    }

    addDestination({
      id: String(Date.now()),
      label,
      address,
      percentage: 0,
    })
    setNewLabel("")
    setNewAddress("")
    toast.success("Recipient added")
  }

  // Moving one slider rebalances the rest proportionally so the total always
  // stays at 100% — the merchant never has to do the arithmetic by hand.
  const handlePercentageChange = (id: string, value: number) => {
    const others = destinations.filter((d) => d.id !== id)
    if (others.length === 0) {
      updateDestination(id, { percentage: value })
      return
    }

    const remaining = 100 - value
    const othersTotal = others.reduce((sum, d) => sum + d.percentage, 0)

    let allocated = 0
    others.forEach((d, i) => {
      let share: number
      if (i === others.length - 1) {
        share = remaining - allocated
      } else {
        // floor keeps the running total under `remaining`, so the last
        // destination can always absorb the exact difference.
        share =
          othersTotal > 0
            ? Math.floor((d.percentage / othersTotal) * remaining)
            : Math.floor(remaining / others.length)
        allocated += share
      }
      updateDestination(d.id, { percentage: Math.max(0, share) })
    })

    updateDestination(id, { percentage: value })
  }

  const handleSave = async () => {
    if (totalPercentage !== 100) {
      toast.error(`Total must be 100%. Currently: ${totalPercentage}%`)
      return
    }
    const missingAddress = destinations.find((d) => d.percentage > 0 && !d.address.trim())
    if (missingAddress) {
      toast.error(`Add an account address for "${missingAddress.label}" before saving`)
      return
    }

    setSaving(true)
    try {
      // Tanto el alta como las ediciones las hace el backend firmando con la
      // wallet de la plataforma, que es el owner on-chain. El comerciante no
      // firma nada ni necesita SOL en ningún momento.
      if (!merchantPda) {
        await create()
      } else {
        await update()
      }
      toast.success("Split routing configuration saved!")
    } catch (err) {
      console.error("Failed to save split routing config", err)
      // El backend explica por qué falló (destino que no es cuenta de token,
      // porcentajes que no suman 100, comercio duplicado): mostrarlo evita que
      // el comercio quede adivinando.
      toast.error((err as Error).message || "Couldn't save your configuration. Please try again.")
    } finally {
      setSaving(false)
    }
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
          <p className="text-xs text-on-surface-variant/70">
            Pegá la dirección de una billetera de Solana. Nos encargamos de
            prepararla para recibir cobros.
          </p>

          {wallets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {wallets.map((w) => (
                <button
                  key={w.address}
                  type="button"
                  onClick={() => setNewAddress(w.address)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[11px] font-mono text-on-surface-variant transition-colors"
                >
                  {w.esDeLaCuenta ? "Mi cuenta" : "Mi billetera"} · {w.address.slice(0, 4)}…{w.address.slice(-4)}
                </button>
              ))}
            </div>
          )}
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
              placeholder="Dirección de billetera"
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
