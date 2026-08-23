import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer, type BuiltTransaction } from "@/lib/api/relayer"

export const dynamic = "force-dynamic"

/**
 * Endpoint de Solana Pay en modo "transaction request".
 *
 * El QR del POS apunta aquí en vez de codificar una transferencia suelta. La
 * diferencia es el negocio entero: una transferencia directa va del cliente al
 * comercio sin pasar por el contrato, así que **no hay reparto entre destinos
 * ni comisiones**. Apuntando aquí, la billetera recibe una transacción que
 * ejecuta `pay()`, con el reparto y las comisiones que el comercio configuró.
 *
 * La transacción vuelve ya firmada por el relayer, que es el pagador del fee de
 * red: el cliente solo añade su firma y la envía, sin necesitar SOL.
 */

const querySchema = z.object({
  merchant: z.string().min(32),
  amount: z.string().min(1),
  label: z.string().optional(),
  reference: z.string().optional(),
  // Lo que el comercio tipeó para este cobro puntual ("Café", "Galleta"),
  // no el nombre del comercio — así el cliente ve en su wallet qué pagó.
  product: z.string().max(60).optional(),
})

const bodySchema = z.object({
  account: z.string().min(32),
})

function parseQuery(request: Request) {
  const params = new URL(request.url).searchParams
  return querySchema.safeParse({
    merchant: params.get("merchant") ?? "",
    amount: params.get("amount") ?? "",
    label: params.get("label") ?? undefined,
    reference: params.get("reference") ?? undefined,
    product: params.get("product") ?? undefined,
  })
}

function withProduct(label: string, product?: string): string {
  return product ? `${label} — ${product}` : label
}

// La billetera pide primero cómo presentar el cobro al usuario.
export async function GET(request: Request) {
  const query = parseQuery(request)
  const label = query.success ? (query.data.label ?? "LatamLink Pay") : "LatamLink Pay"
  const product = query.success ? query.data.product : undefined

  return NextResponse.json({
    label: withProduct(label, product),
    icon: new URL("/Logo.webp", request.url).toString(),
  })
}

export async function POST(request: Request) {
  const query = parseQuery(request)
  if (!query.success) {
    return NextResponse.json({ error: "Cobro inválido o incompleto" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const parsedBody = bodySchema.safeParse(body)
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Falta la cuenta del pagador" }, { status: 400 })
  }

  try {
    const built = await callRelayer<BuiltTransaction>({
      path: "/payments/solana-pay",
      method: "POST",
      body: {
        merchantAddress: query.data.merchant,
        payerPubkey: parsedBody.data.account,
        amount: query.data.amount,
        reference: query.data.reference,
      },
    })

    return NextResponse.json({
      transaction: built.transaction,
      message: `${withProduct(query.data.label ?? "LatamLink Pay", query.data.product)} — pago sin comisión de red`,
    })
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
