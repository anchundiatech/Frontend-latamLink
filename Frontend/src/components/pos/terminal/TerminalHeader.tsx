"use client"

import { ArrowLeft } from "lucide-react"

interface TerminalHeaderProps {
  showBack: boolean
  onBack: () => void
}

export function TerminalHeader({ showBack, onBack }: TerminalHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div>
        <h1 className="text-headline-lg font-heading text-on-surface">POS Terminal</h1>
        <p className="text-xs text-on-surface-variant">Accept instant payments</p>
      </div>
      {showBack && (
        <button
          onClick={onBack}
          className="ml-auto flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back
        </button>
      )}
    </div>
  )
}
