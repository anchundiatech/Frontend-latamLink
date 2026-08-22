/* eslint-disable react-hooks/set-state-in-effect -- navigator.onLine isn't available at render time (SSR-safe default above) */
"use client"

import { useEffect, useState } from "react"

/**
 * Estado de conectividad del navegador. El POS nunca debe confirmar un pago
 * ni mostrar éxito sin conectividad verificada: esto alimenta ese indicador,
 * no decide por sí solo si un pago es válido.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  return online
}
