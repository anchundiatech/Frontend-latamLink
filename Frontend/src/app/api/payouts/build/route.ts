import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer } from "@/lib/api/relayer"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  ownerPubkey: z.string().min(32),
  mint: z.string().min(32),
  destination: z.string().min(32),
  amount: z.union([z.string(), z.number()]),
  decimals: z.number().int().min(0).max(18),
})

// Arma el retiro sin comisión de red para el comerciante: el relayer paga el
// fee, pero solo el dueño de la cuenta puede firmar que ese dinero sale.
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de retiro inválidos o incompletos" }, { status: 400 })
  }

  try {
    const built = await callRelayer({
      operator: true,
      path: "/payouts/build",
      method: "POST",
      body: parsed.data,
    })
    return NextResponse.json(built)
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
