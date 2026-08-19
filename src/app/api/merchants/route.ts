import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer, type CreatedMerchant } from "@/lib/api/relayer"
import {
  CatalogError,
  createDestination,
  createMerchant as createCatalogMerchant,
  createOwner,
  createTerminal,
  getMerchantsByOwner,
} from "@/lib/api/catalog"

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
  // Wallet del comerciante (Privy). Es la identidad con la que después
  // recupera su comercio desde cualquier dispositivo.
  ownerPubkey: z.string().min(32),
  email: z.string().email().optional(),
  labels: z.array(z.string()).optional(),
})

/**
 * Alta de comercio.
 *
 * El comercio NO firma nada on-chain: lo crea el relayer con la wallet de la
 * plataforma como `owner`. Es la única configuración en la que las comisiones
 * (gas_vault y comisión POS) quedan del lado de la plataforma, porque el
 * contrato solo permite retirarlas al owner.
 *
 * Después del alta on-chain se registra todo en PostgreSQL, que es la fuente de
 * verdad de la app: sin eso, la configuración vivía en el navegador y se perdía
 * al cambiar de dispositivo.
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

  const { name, ownerPubkey, email, labels, ...merchantData } = parsed.data

  if (merchantData.destinations.length !== merchantData.percentages.length) {
    return NextResponse.json({ error: "Cada destino necesita su porcentaje" }, { status: 400 })
  }
  const total = merchantData.percentages.reduce((sum, p) => sum + p, 0)
  if (total !== 100) {
    return NextResponse.json(
      { error: `Los porcentajes deben sumar 100 (suman ${total})` },
      { status: 400 }
    )
  }

  // 1. Crear las cuentas on-chain. Es el paso irreversible: si algo falla
  //    después, el comercio existe en la cadena y hay que reflejarlo igual.
  let created: CreatedMerchant
  try {
    created = await callRelayer<CreatedMerchant>({
      path: "/merchants",
      method: "POST",
      operator: true,
      body: merchantData,
    })
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }

  // 2. Registrarlo en la base. Si esto falla, el alta on-chain ya ocurrió: se
  //    devuelven las direcciones igual, con el aviso, para no dejar al comercio
  //    sin sus datos ni provocar un segundo alta que gastaría renta otra vez.
  try {
    const existing = await getMerchantsByOwner(ownerPubkey).catch(() => null)
    const owner =
      existing ?? (await createOwner({ pubkey: ownerPubkey, embeddedWalletPda: ownerPubkey, email, name }))

    const merchant = await createCatalogMerchant({
      merchantOwnerId: owner.id,
      merchantIdOnchain: created.merchantId,
      pdaAddress: created.merchant,
      pdaPaymentVault: created.vault,
      pdaGasVault: created.gasVault,
      name,
      feeBps: merchantData.feeBps,
      posFeeBps: merchantData.posFeeBps,
      minPaymentAmount: merchantData.minPaymentAmount,
      isActive: true,
    })

    await Promise.all(
      merchantData.destinations.map((destinationPubkey, index) =>
        createDestination({
          merchantId: merchant.id,
          destinationPubkey,
          percentage: merchantData.percentages[index]!,
          positionIndex: index,
          description: labels?.[index],
        })
      )
    )

    const terminal = await createTerminal({
      merchantId: merchant.id,
      posTerminalId: merchantData.posTerminalId,
    })

    return NextResponse.json(
      { ...created, name, merchantDbId: merchant.id, terminalDbId: terminal.id },
      { status: 201 }
    )
  } catch (error) {
    console.error("Comercio creado on-chain pero no registrado en la base:", error)
    const detail = error instanceof CatalogError ? error.message : "error desconocido"
    return NextResponse.json(
      {
        ...created,
        name,
        warning: `El comercio se creó en la cadena pero no se pudo guardar en la base (${detail}). No repitas el alta: reintentá el registro con estos datos.`,
      },
      { status: 201 }
    )
  }
}

/** Recupera el comercio del comerciante autenticado, desde la base. */
export async function GET(request: Request) {
  const ownerPubkey = new URL(request.url).searchParams.get("owner")
  if (!ownerPubkey) {
    return NextResponse.json({ error: "Falta el parámetro owner" }, { status: 400 })
  }

  try {
    const owner = await getMerchantsByOwner(ownerPubkey)
    return NextResponse.json(owner)
  } catch (error) {
    const status = error instanceof CatalogError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
