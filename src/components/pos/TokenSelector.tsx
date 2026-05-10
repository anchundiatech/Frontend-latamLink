"use client"

import { motion } from "framer-motion"

type Token = "usdc" | "sol"

interface TokenSelectorProps {
  selected: Token
  onSelect: (token: Token) => void
}

export function TokenSelector({ selected, onSelect }: TokenSelectorProps) {
  const tokens: { id: Token; label: string; icon: string }[] = [
    { id: "usdc", label: "USDC", icon: "$" },
    { id: "sol", label: "SOL", icon: "◎" },
  ]

  return (
    <div className="flex items-center gap-2">
      {tokens.map((token) => (
        <button
          key={token.id}
          onClick={() => onSelect(token.id)}
          className={`relative px-4 py-2 rounded-default text-xs font-heading font-medium transition-all duration-200 ${
            selected === token.id
              ? "text-on-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {selected === token.id && (
            <motion.div
              layoutId="token-bg"
              className="absolute inset-0 bg-electric-purple rounded-default"
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <span>{token.icon}</span>
            {token.label}
          </span>
        </button>
      ))}
    </div>
  )
}
