"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * El modo kiosko no se detecta por tamaño de pantalla: lo activa el
 * operador a propósito (dispositivo dedicado, pantalla fija). Se modela
 * como el estado real de Fullscreen API, no como un breakpoint más.
 */
export function useFullscreen(): { isFullscreen: boolean; toggle: () => void } {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const update = () => setIsFullscreen(document.fullscreenElement !== null)
    update()
    document.addEventListener("fullscreenchange", update)
    return () => document.removeEventListener("fullscreenchange", update)
  }, [])

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen().catch(() => {
        // Algunos navegadores rechazan requestFullscreen fuera de un gesto
        // del usuario o en iframes; el POS sigue funcionando sin kiosko.
      })
    }
  }, [])

  return { isFullscreen, toggle }
}
