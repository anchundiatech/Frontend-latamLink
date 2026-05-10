"use client"

import { motion } from "framer-motion"
import { Wallet, PiggyBank, ArrowRightLeft } from "lucide-react"

const treasuries = [
  {
    label: "Operations",
    balance: "1,234.56 USDC",
    percentage: "50%",
    icon: Wallet,
    color: "text-electric-purple",
    bg: "bg-electric-purple/10",
  },
  {
    label: "Savings",
    balance: "740.74 USDC",
    percentage: "30%",
    icon: PiggyBank,
    color: "text-electric-teal",
    bg: "bg-electric-teal/10",
  },
  {
    label: "Suppliers",
    balance: "493.83 USDC",
    percentage: "20%",
    icon: ArrowRightLeft,
    color: "text-tertiary",
    bg: "bg-tertiary/10",
  },
]

export function TreasurySummary() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass rounded-lg p-4 sm:p-6"
    >
      <h3 className="text-sm font-heading font-medium text-on-surface mb-4">
        Treasury Distribution
      </h3>
      <div className="space-y-3">
        {treasuries.map((t) => (
          <div
            key={t.label}
            className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]"
          >
            <div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center`}>
              <t.icon className={`w-4 h-4 ${t.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading text-on-surface">{t.label}</p>
              <p className="text-xs text-on-surface-variant truncate">{t.balance}</p>
            </div>
            <span className="text-sm font-heading text-on-surface-variant">
              {t.percentage}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden flex">
          {treasuries.map((t, i) => (
            <div
              key={t.label}
              className="h-full transition-all duration-500"
              style={{
                width: t.percentage,
                backgroundColor:
                  i === 0
                    ? "#a855f7"
                    : i === 1
                      ? "#2dd4bf"
                      : "#adc6ff",
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
