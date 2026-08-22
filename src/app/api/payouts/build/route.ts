import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer } from "@/lib/api/relayer"

export const dynamic = "force-dynamic"

const schema = z.object({
  ownerPubkey: z.string().min(32),
  mint: z.string().min(32),
  destination: z.string().min(32),
  amount: z.string().min(1),
  decimals: z.number().int().min(0).max(18),
})

/** Paso 1 del retiro: arma la transferencia para que el comerciante la firme. */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos del retiro inválidos" }, { status: 400 })
  }

  try {
    const built = await callRelayer<Record<string, unknown>>({
      path: "/payouts/build",
      method: "POST",
      operator: true,
      body: parsed.data,
    })
    return NextResponse.json(built)
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
