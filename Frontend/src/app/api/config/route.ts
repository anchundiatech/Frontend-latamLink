import { NextResponse } from "next/server"
import { callRelayer, RelayerError, type RelayerConfig } from "@/lib/api/relayer"

// Proxy same-origin al relayer: la app nunca expone RELAYER_URL al navegador.
export async function GET() {
  try {
    const config = await callRelayer<RelayerConfig>({ path: "/config" })
    return NextResponse.json(config)
  } catch (error) {
    if (error instanceof RelayerError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error al obtener la configuración del relayer:", error)
    return NextResponse.json({ error: "No se pudo obtener la configuración" }, { status: 500 })
  }
}
