"use client"

import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Percent, X } from "lucide-react"
import { toast } from "sonner"
import { updateMerchantConfig } from "@/lib/api/merchants"
import { shortenAddress } from "@/lib/utils"

export interface EditableMerchant {
  address: string
  terminalId: string
  destinations: string[]
  percentages: number[]
  minPaymentAmount: string
  feeBps: number
  posFeeBps: number
}

interface MerchantFeeEditorProps {
  merchant: EditableMerchant | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

// El comerciante nunca ve esto — solo el admin, y solo acá, cambia cuánto
// cobra la plataforma o la terminal por transacción (AGENTS.md: eso es lo
// que "no conoce" el comerciante).
export function MerchantFeeEditor({ merchant, onOpenChange, onSaved }: MerchantFeeEditorProps) {
  const [platformFee, setPlatformFee] = useState("")
  const [posFee, setPosFee] = useState("")
  const [saving, setSaving] = useState(false)

  const open = merchant !== null

  // Reset the inputs to the merchant's current values every time a new one
  // is opened, instead of carrying over whatever was left from the last edit.
  const key = merchant?.address ?? ""
  const [loadedFor, setLoadedFor] = useState("")
  if (merchant && loadedFor !== key) {
    setLoadedFor(key)
    setPlatformFee((merchant.feeBps / 100).toString())
    setPosFee((merchant.posFeeBps / 100).toString())
  }

  const handleSave = async () => {
    if (!merchant) return

    const platformBps = Math.round(parseFloat(platformFee) * 100)
    const posBps = Math.round(parseFloat(posFee) * 100)

    if (!Number.isFinite(platformBps) || platformBps < 0 || platformBps > 10_000) {
      toast.error("La comisión de plataforma debe estar entre 0% y 100%")
      return
    }
    if (!Number.isFinite(posBps) || posBps < 0 || posBps > 10_000) {
      toast.error("La comisión de POS debe estar entre 0% y 100%")
      return
    }

    setSaving(true)
    try {
      await updateMerchantConfig(merchant.address, {
        destinations: merchant.destinations,
        percentages: merchant.percentages,
        feeBps: platformBps,
        posFeeBps: posBps,
        minPaymentAmount: merchant.minPaymentAmount,
      })
      toast.success(`Fees updated for ${merchant.terminalId}`)
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-[calc(100%-2rem)] max-w-sm glass-strong rounded-xl p-6 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-electric-purple/10 flex items-center justify-center shrink-0">
                <Percent className="w-4 h-4 text-electric-purple" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-heading font-semibold text-on-surface">
                  Configure fees
                </Dialog.Title>
                <Dialog.Description className="text-xs font-mono text-on-surface-variant">
                  {merchant ? `${merchant.terminalId} · ${shortenAddress(merchant.address, 4)}` : ""}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close"
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-xs text-on-surface-variant mt-3 mb-5">
            This is admin-only configuration — merchants never see or set these values.
          </p>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-on-surface-variant">Platform fee (%)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.01}
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                disabled={saving}
                className="mt-1 w-full bg-surface-container-low border border-white/10 rounded-default px-3 py-2 text-sm font-mono text-on-surface focus:outline-none focus:border-electric-purple/50 disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="text-xs text-on-surface-variant">POS fee (%)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.01}
                value={posFee}
                onChange={(e) => setPosFee(e.target.value)}
                disabled={saving}
                className="mt-1 w-full bg-surface-container-low border border-white/10 rounded-default px-3 py-2 text-sm font-mono text-on-surface focus:outline-none focus:border-electric-purple/50 disabled:opacity-60"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <Dialog.Close asChild>
              <button
                disabled={saving}
                className="px-4 py-2 rounded-lg text-xs font-heading text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-heading font-medium bg-electric-purple text-white hover:bg-electric-purple/90 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save fees"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
