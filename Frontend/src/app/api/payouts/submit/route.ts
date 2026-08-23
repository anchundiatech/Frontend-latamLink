import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer } from "@/lib/api/relayer"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  transaction: z.string().min(1),
})

// Envía el retiro ya firmado por el comerciante con su parte y por el relayer
// con la suya (paga la red).
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta la transacción firmada" }, { status: 400 })
  }

  try {
    const submitted = await callRelayer({
      operator: true,
      path: "/payouts/submit",
      method: "POST",
      body: parsed.data,
    })
    return NextResponse.json(submitted)
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
