import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer, type CreatedMerchant } from "@/lib/api/relayer"

export const dynamic = "force-dynamic"

const schema = z.object({
  name: z.string().min(3, "El nombre del comercio es muy corto"),
  posTerminalId: z.string().min(1).max(32),
  paymentTokenMint: z.string().min(32),
  // Cuentas de token (no billeteras): es lo que exige el contrato.
  destinations: z.array(z.string().min(32)).min(1).max(10),
  percentages: z.array(z.number().int().min(1).max(100)).min(1).max(10),
  feeBps: z.number().int().min(0).max(10_000),
  posFeeBps: z.number().int().min(0).max(10_000),
  minPaymentAmount: z.string(),
})

/**
 * Alta de comercio.
 *
 * El comercio NO firma nada on-chain: lo crea el relayer con la wallet de la
 * plataforma como `owner`. Es la única configuración en la que las comisiones
 * (gas_vault y comisión POS) quedan del lado de la plataforma, porque el
 * contrato solo permite retirarlas al owner. De paso, el comercio ya no
 * necesita SOL para darse de alta.
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
    return NextResponse.json(
      { error: "Datos del comercio inválidos", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { name, ...merchantData } = parsed.data

  if (merchantData.destinations.length !== merchantData.percentages.length) {
    return NextResponse.json(
      { error: "Cada destino necesita su porcentaje" },
      { status: 400 }
    )
  }
  const total = merchantData.percentages.reduce((sum, p) => sum + p, 0)
  if (total !== 100) {
    return NextResponse.json(
      { error: `Los porcentajes deben sumar 100 (suman ${total})` },
      { status: 400 }
    )
  }

  try {
    const created = await callRelayer<CreatedMerchant>({
      path: "/merchants",
      method: "POST",
      operator: true,
      body: merchantData,
    })

    return NextResponse.json({ ...created, name }, { status: 201 })
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
