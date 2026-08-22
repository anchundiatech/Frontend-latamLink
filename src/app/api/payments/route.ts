import { NextResponse } from "next/server"
import { CatalogError, listPayments } from "@/lib/api/catalog"

export const dynamic = "force-dynamic"

/** Historial de cobros de un comercio, desde PostgreSQL. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const merchantId = params.get("merchantId")
  if (!merchantId) {
    return NextResponse.json({ error: "Falta el parámetro merchantId" }, { status: 400 })
  }

  const limit = Number(params.get("limit"))
  const offset = Number(params.get("offset"))

  try {
    const payments = await listPayments(merchantId, {
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      offset: Number.isFinite(offset) && offset > 0 ? offset : undefined,
    })
    return NextResponse.json({ payments })
  } catch (error) {
    const status = error instanceof CatalogError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
