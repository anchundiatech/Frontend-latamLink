"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { QrCode, ArrowLeft, ArrowRight, Check, Smartphone } from "lucide-react"
import { useMerchantStore } from "@/lib/store/useMerchantStore"

export function StepCreatePOS({
  onNext,
  onPrev,
}: {
  onNext: () => void
  onPrev: () => void
}) {
  const { name, terminalId, paymentToken, setMerchant } = useMerchantStore()
  const [config, setConfig] = useState({
    terminalName: terminalId,
    token: paymentToken,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMerchant({ terminalId: config.terminalName, paymentToken: config.token })
    onNext()
  }

  return (
    <div className="glass-strong rounded-xl p-8 space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-16 h-16 rounded-xl bg-electric-purple/10 flex items-center justify-center mx-auto"
      >
        <Smartphone className="w-8 h-8 text-electric-purple" />
      </motion.div>
      <div className="text-center">
        <h2 className="text-headline-lg font-heading text-on-surface mb-2">
          Create Your POS Terminal
        </h2>
        <p className="text-sm text-on-surface-variant">
          Customize your payment terminal. Customers will scan a QR code to pay.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-heading font-medium text-on-surface-variant uppercase tracking-wider">
            Terminal Name
          </label>
          <input
            value={config.terminalName}
            onChange={(e) => setConfig({ ...config, terminalName: e.target.value })}
            className="w-full bg-surface-container-low border border-white/10 rounded-default px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-electric-purple/50 focus:ring-1 focus:ring-electric-purple/20 transition-all"
            placeholder="POS-001"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-heading font-medium text-on-surface-variant uppercase tracking-wider">
            Accept Payments In
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "usdc" as const, label: "USDC", desc: "Stablecoin" },
              { id: "sol" as const, label: "SOL", desc: "Solana" },
            ].map((opt) => (
              <button
                type="button"
                key={opt.id}
                onClick={() => setConfig({ ...config, token: opt.id })}
                className={`p-4 rounded-default border text-left transition-all ${
                  config.token === opt.id
                    ? "border-electric-purple/50 bg-electric-purple/10"
                    : "border-white/5 bg-surface-container-low hover:bg-surface-container"
                }`}
              >
                <p className="text-sm font-heading text-on-surface">{opt.label}</p>
                <p className="text-xs text-on-surface-variant">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-lg p-4 space-y-3">
          <p className="text-xs text-on-surface-variant font-heading uppercase tracking-wider">
            Terminal Summary
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Business</span>
            <span className="text-on-surface font-heading">{name}</span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Terminal</span>
            <span className="font-mono text-on-surface">{config.terminalName}</span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Accepted Token</span>
            <span className="font-heading text-on-surface uppercase">{config.token}</span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">QR Code</span>
            <span className="flex items-center gap-1.5 text-electric-teal font-heading">
              <Check className="w-3 h-3" />
              Ready
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-32 h-32 glass rounded-lg flex items-center justify-center">
            <QrCode className="w-10 h-10 text-on-surface-variant" />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onPrev}
            className="flex items-center gap-2 px-4 py-3 rounded-default text-sm font-heading text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium px-6 py-3 rounded-default transition-all duration-200 text-sm"
          >
            Create Terminal
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
