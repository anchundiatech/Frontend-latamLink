"use client"

import { Tag } from "lucide-react"

interface ConceptInputProps {
  value: string
  onChange: (value: string) => void
  size?: "default" | "large"
}

// Campo opcional para que la wallet del cliente muestre qué está pagando
// ("Café", "Galleta"), no solo el nombre del comercio.
export function ConceptInput({ value, onChange, size = "default" }: ConceptInputProps) {
  return (
    <div
      className={`w-full flex items-center gap-2 glass rounded-lg px-3 ${
        size === "large" ? "max-w-md py-3" : "max-w-xs py-2"
      }`}
    >
      <Tag className="w-4 h-4 text-on-surface-variant shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="¿Qué estás cobrando? (opcional)"
        maxLength={40}
        className={`w-full bg-transparent text-on-surface placeholder-on-surface-variant/50 focus:outline-none ${
          size === "large" ? "text-base" : "text-sm"
        }`}
      />
    </div>
  )
}
