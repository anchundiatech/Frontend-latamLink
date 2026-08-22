/* eslint-disable react-hooks/set-state-in-effect -- matchMedia isn't available at render time (SSR-safe default above) */
"use client"

import { useEffect, useState } from "react"

export type DeviceType = "mobile" | "tablet-portrait" | "tablet-landscape" | "laptop" | "desktop"

// No son los breakpoints de Tailwind por defecto: acá necesitamos distinguir
// tablet portrait/landscape, que Tailwind no separa.
const QUERIES: Record<Exclude<DeviceType, "tablet-portrait" | "tablet-landscape">, string> = {
  mobile: "(max-width: 639px)",
  laptop: "(min-width: 1024px) and (max-width: 1279px)",
  desktop: "(min-width: 1280px)",
}
const TABLET_QUERY = "(min-width: 640px) and (max-width: 1023px)"
const PORTRAIT_QUERY = "(orientation: portrait)"

function classify(): DeviceType {
  if (typeof window === "undefined") return "desktop"
  if (window.matchMedia(QUERIES.mobile).matches) return "mobile"
  if (window.matchMedia(TABLET_QUERY).matches) {
    return window.matchMedia(PORTRAIT_QUERY).matches ? "tablet-portrait" : "tablet-landscape"
  }
  if (window.matchMedia(QUERIES.laptop).matches) return "laptop"
  return "desktop"
}

/**
 * Clasifica el dispositivo por viewport, no por user-agent: el POS debe
 * adaptarse al tamaño real de pantalla (una tablet en modo landscape se
 * comporta como laptop), no a qué navegador dice ser.
 */
export function useDeviceType(): DeviceType {
  // Server-safe default; se corrige en el primer efecto del cliente.
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop")

  useEffect(() => {
    setDeviceType(classify())

    const queries = [QUERIES.mobile, TABLET_QUERY, QUERIES.laptop, QUERIES.desktop, PORTRAIT_QUERY].map(
      (q) => window.matchMedia(q)
    )
    const update = () => setDeviceType(classify())

    queries.forEach((mql) => mql.addEventListener("change", update))
    return () => queries.forEach((mql) => mql.removeEventListener("change", update))
  }, [])

  return deviceType
}
