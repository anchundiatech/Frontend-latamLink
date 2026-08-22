"use client"

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus"

interface TerminalStatusProps {
  isActive: boolean
}

// Nunca mostrar "Live" como texto estático: depende de si la terminal está
// activa y de si el navegador tiene conexión real ahora mismo.
export function TerminalStatus({ isActive }: TerminalStatusProps) {
  const online = useOnlineStatus()

  if (!online) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-error" />
        <span className="text-xs text-error font-heading">Offline</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${isActive ? "bg-success animate-pulse" : "bg-on-surface-variant"}`}
      />
      <span className={`text-xs font-heading ${isActive ? "text-success" : "text-on-surface-variant"}`}>
        {isActive ? "Live" : "Inactive"}
      </span>
    </div>
  )
}
