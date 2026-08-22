import { NextResponse } from "next/server"
import { RelayerError, callRelayer, type RelayerConfig } from "@/lib/api/relayer"

export const dynamic = "force-dynamic"

/**
 * Configuración pública del rail de pagos (mint en uso, decimales, programa).
 * Evita que la app hardcodee direcciones que dependen del entorno.
 */
export async function GET() {
  try {
    const config = await callRelayer<RelayerConfig>({ path: "/config" })
    return NextResponse.json(config)
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
