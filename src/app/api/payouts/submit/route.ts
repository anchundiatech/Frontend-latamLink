import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer } from "@/lib/api/relayer"

export const dynamic = "force-dynamic"

const schema = z.object({ transaction: z.string().min(1) })

/** Paso 2 del retiro: el relayer valida, paga la red y envía. */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta la transacción firmada" }, { status: 400 })
  }

  try {
    const result = await callRelayer<{ signature: string }>({
      path: "/payouts/submit",
      method: "POST",
      operator: true,
      body: parsed.data,
      timeoutMs: 60_000,
    })
    return NextResponse.json(result)
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
