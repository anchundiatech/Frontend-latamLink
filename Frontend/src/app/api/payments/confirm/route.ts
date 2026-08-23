import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer } from "@/lib/api/relayer"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  reference: z.string().min(32),
  merchantPda: z.string().min(32),
  ownerPubkey: z.string().min(32),
  mint: z.string().min(32),
})

// Avisa que un cobro por transferencia directa se confirmó, para que quede
// en el historial. No hace falta credencial: el relayer relee la transacción
// real antes de creerle nada a lo que mande el navegador.
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de confirmación inválidos o incompletos" }, { status: 400 })
  }

  try {
    const result = await callRelayer({
      path: "/payments/confirm-transfer",
      method: "POST",
      body: parsed.data,
    })
    return NextResponse.json(result)
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
