import { NextResponse } from "next/server"
import { z } from "zod"
import { CatalogError, listPayments } from "@/lib/api/catalog"

export const dynamic = "force-dynamic"

const querySchema = z.object({
  merchantId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

// Historial de cobros: la fuente de verdad es Postgres, no el JSONL del
// relayer, porque ahí quedan el importe, las comisiones y la terminal exactos
// de cada cobro ya repartido.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const parsed = querySchema.safeParse({
    merchantId: params.get("merchantId") ?? "",
    limit: params.get("limit") ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta el parámetro merchantId" }, { status: 400 })
  }

  try {
    const payments = await listPayments(parsed.data.merchantId, { limit: parsed.data.limit })
    return NextResponse.json({ payments })
  } catch (error) {
    const status = error instanceof CatalogError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
