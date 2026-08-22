import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer, type BuiltTransaction } from "@/lib/api/relayer"

export const dynamic = "force-dynamic"

const schema = z.object({
  merchantAddress: z.string().min(32),
  payerPubkey: z.string().min(32),
  amount: z.string().min(1),
})

/**
 * Paso 1 del pago sin gas: devuelve la transacción armada para que el usuario
 * firme solo su parte. El fee de red lo paga el relayer.
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
    return NextResponse.json({ error: "Datos del pago inválidos" }, { status: 400 })
  }

  try {
    const built = await callRelayer<BuiltTransaction>({
      path: "/payments/build",
      method: "POST",
      body: parsed.data,
    })
    return NextResponse.json(built)
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
