"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Delete, DollarSign, Loader2 } from "lucide-react"

interface AmountInputProps {
  amount: string
  onAmountChange: (amount: string) => void
  onSubmit: () => void
  submitting?: boolean
  minAmount?: number
}

const keypad = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "backspace"],
]

export function AmountInput({ amount, onAmountChange, onSubmit, submitting = false, minAmount = 0 }: AmountInputProps) {
  const handleKey = (key: string) => {
    if (key === "backspace") {
      onAmountChange(amount.slice(0, -1))
    } else if (key === ".") {
      if (!amount.includes(".")) onAmountChange(amount + ".")
    } else {
      // Money amounts never need more than 2 decimal places.
      const decimals = amount.split(".")[1]
      if (decimals !== undefined && decimals.length >= 2) return
      if (amount === "0") {
        onAmountChange(key)
      } else {
        onAmountChange(amount + key)
      }
    }
  }

  const displayAmount = amount || "0"
  const parsed = parseFloat(amount) || 0
  const belowMinimum = parsed > 0 && parsed < minAmount

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="text-center">
        <p className="text-xs text-on-surface-variant font-heading uppercase tracking-wider mb-2">
          Enter Amount
        </p>
        <motion.div
          key={displayAmount}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl sm:text-6xl font-heading font-semibold text-on-surface tracking-tight"
        >
          <span className="text-on-surface-variant">$</span>
          {displayAmount}
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {keypad.flat().map((key) => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            aria-label={key === "backspace" ? "Delete last digit" : key}
            className={`h-14 rounded-default font-heading text-lg transition-all duration-150 active:scale-95 ${
              key === "backspace"
                ? "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high"
                : key === "."
                  ? "bg-surface-container text-on-surface font-bold hover:bg-surface-container-high"
                  : "glass glass-hover text-on-surface"
            }`}
          >
            {key === "backspace" ? (
              <Delete className="w-5 h-5 mx-auto" />
            ) : (
              key
            )}
          </button>
        ))}
      </div>

      {belowMinimum && (
        <p className="text-xs text-warning text-center">
          Minimum payment amount: ${minAmount.toFixed(2)}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={!amount || parsed <= 0 || belowMinimum || submitting}
        className="w-full max-w-xs bg-electric-purple hover:bg-electric-purple/90 disabled:opacity-30 disabled:cursor-not-allowed text-white font-heading font-medium py-4 rounded-default transition-all duration-200 flex items-center justify-center gap-2 text-sm"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Getting exchange rate...
          </>
        ) : (
          <>
            <DollarSign className="w-4 h-4" />
            Generate Payment QR
          </>
        )}
      </button>
    </div>
  )
}
