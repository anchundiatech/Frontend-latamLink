"use client"

import { motion } from "framer-motion"

interface AmountDisplayProps {
  amount: string
  minAmount?: number
  size?: "default" | "large"
}

export function AmountDisplay({ amount, minAmount = 0, size = "default" }: AmountDisplayProps) {
  const displayAmount = amount || "0"
  const parsed = parseFloat(amount) || 0
  const belowMinimum = parsed > 0 && parsed < minAmount

  return (
    <div className="text-center">
      <p className="text-xs text-on-surface-variant font-heading uppercase tracking-wider mb-2">
        Enter Amount
      </p>
      <motion.div
        key={displayAmount}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={
          size === "large"
            ? "text-7xl sm:text-8xl font-heading font-semibold text-on-surface tracking-tight"
            : "text-5xl sm:text-6xl font-heading font-semibold text-on-surface tracking-tight"
        }
      >
        <span className="text-on-surface-variant">$</span>
        {displayAmount}
      </motion.div>
      {belowMinimum && (
        <p className="text-xs text-warning text-center mt-4">
          Minimum payment amount: ${minAmount.toFixed(2)}
        </p>
      )}
    </div>
  )
}
