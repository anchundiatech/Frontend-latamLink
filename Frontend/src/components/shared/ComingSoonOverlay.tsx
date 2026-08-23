"use client"

import { Clock } from "lucide-react"
import type { ReactNode } from "react"

interface ComingSoonOverlayProps {
  children: ReactNode
  label?: string
}

// Envuelve una card ya construida y la vuelve de solo lectura, sin tocar su
// lógica interna: se usa para funciones que hoy administra el equipo interno
// y todavía no están habilitadas para que el comerciante las controle.
export function ComingSoonOverlay({ children, label = "Próximamente" }: ComingSoonOverlayProps) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-50 grayscale-[40%]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-end p-3 sm:p-4">
        <span className="inline-flex items-center gap-1.5 glass-strong text-on-surface-variant text-[11px] font-heading font-medium px-2.5 py-1 rounded-full">
          <Clock className="w-3 h-3 text-accent-alert" />
          {label}
        </span>
      </div>
    </div>
  )
}
