"use client"

import { Delete } from "lucide-react"

interface POSKeypadProps {
  amount: string
  onAmountChange: (amount: string) => void
  size?: "default" | "large"
}

const keypad = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "backspace"],
]

export function POSKeypad({ amount, onAmountChange, size = "default" }: POSKeypadProps) {
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

  const buttonSizeClass = size === "large" ? "h-20 text-2xl" : "h-14 text-lg"

  return (
    <div className={size === "large" ? "grid grid-cols-3 gap-3 w-full max-w-md" : "grid grid-cols-3 gap-2 w-full max-w-xs"}>
      {keypad.flat().map((key) => (
        <button
          key={key}
          onClick={() => handleKey(key)}
          aria-label={key === "backspace" ? "Delete last digit" : key}
          className={`${buttonSizeClass} rounded-default font-heading transition-all duration-150 active:scale-95 ${
            key === "backspace"
              ? "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high"
              : key === "."
                ? "bg-surface-container text-on-surface font-bold hover:bg-surface-container-high"
                : "glass glass-hover text-on-surface"
          }`}
        >
          {key === "backspace" ? (
            <Delete className={size === "large" ? "w-7 h-7 mx-auto" : "w-5 h-5 mx-auto"} />
          ) : (
            key
          )}
        </button>
      ))}
    </div>
  )
}
