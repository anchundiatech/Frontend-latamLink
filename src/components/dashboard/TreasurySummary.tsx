"use client"

import { motion } from "framer-motion"
import { Wallet, PiggyBank, ArrowRightLeft, GitBranch } from "lucide-react"
import Link from "next/link"
import { useMerchantStore } from "@/lib/store/useMerchantStore"

const icons = [Wallet, PiggyBank, ArrowRightLeft]
const colors = [
  { color: "text-electric-purple", bg: "bg-electric-purple/10", bar: "#a855f7" },
  { color: "text-electric-teal", bg: "bg-electric-teal/10", bar: "#2dd4bf" },
  { color: "text-tertiary", bg: "bg-tertiary/10", bar: "#adc6ff" },
]

export function TreasurySummary() {
  const { destinations, totalVolume } = useMerchantStore()

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

      {destinations.length === 0 ? (
        <div className="text-center py-6 space-y-3">
          <GitBranch className="w-6 h-6 text-on-surface-variant mx-auto" />
          <p className="text-xs text-on-surface-variant">
            You haven&apos;t set up revenue routing yet.
          </p>
          <Link
            href="/portal/split-routing"
            className="inline-block text-xs text-electric-purple hover:text-electric-purple/80 transition-colors"
          >
            Set up Split Routing
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {destinations.map((dest, i) => {
              const Icon = icons[i % icons.length]
              const c = colors[i % colors.length]
              const share = (totalVolume * dest.percentage) / 100
              return (
                <div
                  key={dest.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02]"
                >
                  <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${c.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-heading text-on-surface">{dest.label}</p>
                    <p className="text-xs text-on-surface-variant truncate">
                      ${share.toFixed(2)} received
                    </p>
                  </div>
                  <span className="text-sm font-heading text-on-surface-variant">
                    {dest.percentage}%
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden flex">
              {destinations.map((dest, i) => (
                <div
                  key={dest.id}
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${dest.percentage}%`,
                    backgroundColor: colors[i % colors.length].bar,
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}
