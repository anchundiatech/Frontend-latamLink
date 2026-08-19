import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer, type SubmittedPayment } from "@/lib/api/relayer"

export const dynamic = "force-dynamic"

const schema = z.object({
  transaction: z.string().min(1),
  reference: z.string().optional(),
})

/**
 * Paso 2: el relayer valida la transacción firmada por el usuario, la firma
 * como pagador del fee y la envía.
 *
 * Devuelve 202 cuando la transacción entró a la red pero no confirmó a tiempo:
 * en ese caso hay que consultar la firma, nunca volver a cobrar.
 */
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
    const result = await callRelayer<SubmittedPayment>({
      path: "/payments/submit",
      method: "POST",
      body: parsed.data,
      timeoutMs: 90_000,
    })
    return NextResponse.json(result)
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
