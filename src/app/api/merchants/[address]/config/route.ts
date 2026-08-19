import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer } from "@/lib/api/relayer"

export const dynamic = "force-dynamic"

const schema = z.object({
  destinations: z.array(z.string().min(32)).min(1).max(10),
  percentages: z.array(z.number().int().min(1).max(100)).min(1).max(10),
  feeBps: z.number().int().min(0).max(10_000),
  posFeeBps: z.number().int().min(0).max(10_000),
  minPaymentAmount: z.string(),
})

/**
 * Actualiza la configuración on-chain del comercio (reparto, comisiones, mínimo).
 *
 * La firma la plataforma, que es el `owner` del comercio. Antes lo intentaba el
 * navegador con la cuenta del comerciante y el contrato lo rechazaba
 * (`has_one = owner`), así que editar el reparto fallaba siempre.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Configuración inválida", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  if (parsed.data.destinations.length !== parsed.data.percentages.length) {
    return NextResponse.json({ error: "Cada destino necesita su porcentaje" }, { status: 400 })
  }
  const total = parsed.data.percentages.reduce((sum, p) => sum + p, 0)
  if (total !== 100) {
    return NextResponse.json(
      { error: `Los porcentajes deben sumar 100 (suman ${total})` },
      { status: 400 }
    )
  }

  try {
    const result = await callRelayer<{ merchant: string; signature: string }>({
      path: `/merchants/${address}/config`,
      method: "PATCH",
      operator: true,
      body: parsed.data,
    })
    return NextResponse.json(result)
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
