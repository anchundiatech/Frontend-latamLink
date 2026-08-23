"use client"

import { Loader2, QrCode } from "lucide-react"

interface POSActionButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  loadingLabel: string
  label: string
  className?: string
}

// Botón de acción principal del POS, compartido entre layouts para que el
// estilo (tamaño de touch target, estados disabled/loading) no diverja entre
// mobile/tablet/desktop/kiosk.
export function POSActionButton({
  onClick,
  disabled = false,
  loading = false,
  loadingLabel,
  label,
  className = "",
}: POSActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full max-w-xs bg-electric-purple hover:bg-electric-purple/90 hover:shadow-lg hover:shadow-electric-purple/20 disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:shadow-none disabled:cursor-not-allowed text-white font-heading font-medium py-4 rounded-default transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          <QrCode className="w-4 h-4" />
          {label}
        </>
      )}
    </button>
  )
}
