"use client"

import { AmountDisplay } from "./AmountDisplay"
import { POSKeypad } from "./POSKeypad"
import { ConceptInput } from "./ConceptInput"
import { POSActionButton } from "@/components/pos/shared/POSActionButton"

interface AmountInputProps {
  amount: string
  onAmountChange: (amount: string) => void
  concept: string
  onConceptChange: (concept: string) => void
  onSubmit: () => void
  submitting?: boolean
  minAmount?: number
}

// Composición por defecto de monto + teclado + botón, para layouts (mobile)
// que los quieren como un solo bloque. Desktop/kiosk componen AmountDisplay
// y POSKeypad por separado para ubicarlos en columnas distintas.
export function AmountInput({
  amount,
  onAmountChange,
  concept,
  onConceptChange,
  onSubmit,
  submitting = false,
  minAmount = 0,
}: AmountInputProps) {
  const parsed = parseFloat(amount) || 0
  const belowMinimum = parsed > 0 && parsed < minAmount

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <AmountDisplay amount={amount} minAmount={minAmount} />
      <ConceptInput value={concept} onChange={onConceptChange} />
      <POSKeypad amount={amount} onAmountChange={onAmountChange} />
      <POSActionButton
        onClick={onSubmit}
        disabled={!amount || parsed <= 0 || belowMinimum || submitting}
        loading={submitting}
        loadingLabel="Getting exchange rate..."
        label="Generate Payment QR"
      />
    </div>
  )
}
