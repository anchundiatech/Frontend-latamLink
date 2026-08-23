import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer } from "@/lib/api/relayer"

export const dynamic = "force-dynamic"

const updateConfigBodySchema = z.object({
  destinations: z.array(z.string().min(32)).min(1).max(10),
  percentages: z.array(z.number().int().min(0).max(100)).min(1).max(10),
  feeBps: z.number().int().min(0).max(10_000),
  posFeeBps: z.number().int().min(0).max(10_000),
  minPaymentAmount: z.union([z.string(), z.number()]),
})

interface RouteParams {
  params: Promise<{ address: string }>
}

// El on-chain es autoritativo. Postgres todavía no expone actualizar o
// desactivar destinos (existe en el backend pero no está montado en las
// rutas de catálogo), así que por ahora esta ruta no sincroniza destinos ahí
// — queda pendiente como seguimiento, no lo simulamos.
export async function PATCH(request: Request, { params }: RouteParams) {
  const { address } = await params
  if (!address || address.length < 32) {
    return NextResponse.json({ error: "Dirección de comercio inválida" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const parsed = updateConfigBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de configuración inválidos o incompletos" }, { status: 400 })
  }
  const input = parsed.data

  if (input.destinations.length !== input.percentages.length) {
    return NextResponse.json(
      { error: "destinations y percentages deben tener la misma longitud" },
      { status: 400 }
    )
  }

  try {
    const result = await callRelayer<{ signature: string }>({
      operator: true,
      path: `/merchants/${address}/config`,
      method: "PATCH",
      body: input,
    })
    return NextResponse.json(result)
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
