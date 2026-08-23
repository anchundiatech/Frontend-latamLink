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

const createMerchantBodySchema = z.object({
  name: z.string().min(1).max(64),
  posTerminalId: z.string().min(1).max(32),
  paymentTokenMint: z.string().min(32),
  destinations: z.array(z.string().min(32)).min(1).max(10),
  percentages: z.array(z.number().int().min(0).max(100)).min(1).max(10),
  feeBps: z.number().int().min(0).max(10_000),
  posFeeBps: z.number().int().min(0).max(10_000),
  minPaymentAmount: z.union([z.string(), z.number()]),
  ownerPubkey: z.string().min(32),
  email: z.string().email().optional(),
  labels: z.array(z.string()).optional(),
})

interface CreateMerchantResponse extends CreatedMerchant {
  name: string
  merchantDbId?: string
  terminalDbId?: string
  /** Presente si el alta on-chain salió bien pero la base falló. */
  warning?: string
}

// Alta de comercio: el on-chain manda, Postgres es una copia para reportes.
// Si el on-chain sale bien pero la base falla, igual respondemos éxito con un
// `warning` — deshacer una alta on-chain no es viable y el comercio ya existe.
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 })
  }

  const parsed = createMerchantBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de comercio inválidos o incompletos" }, { status: 400 })
  }
  const input = parsed.data

  if (input.destinations.length !== input.percentages.length) {
    return NextResponse.json(
      { error: "destinations y percentages deben tener la misma longitud" },
      { status: 400 }
    )
  }

  let onchain: CreatedMerchant
  try {
    onchain = await callRelayer<CreatedMerchant>({
      operator: true,
      path: "/merchants",
      method: "POST",
      body: {
        paymentTokenMint: input.paymentTokenMint,
        destinations: input.destinations,
        percentages: input.percentages,
        posTerminalId: input.posTerminalId,
        feeBps: input.feeBps,
        posFeeBps: input.posFeeBps,
        minPaymentAmount: input.minPaymentAmount,
      },
    })
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }

  const response: CreateMerchantResponse = { ...onchain, name: input.name }

  try {
    let ownerId: string
    try {
      const owner = await getMerchantsByOwner(input.ownerPubkey)
      ownerId = owner.id
    } catch (error) {
      if (!(error instanceof CatalogError) || error.status !== 404) throw error
      const owner = await createOwner({
        pubkey: input.ownerPubkey,
        // En este modelo la wallet embebida de Privy y la pubkey del owner
        // son el mismo valor: no hay wallet externa separada.
        embeddedWalletPda: input.ownerPubkey,
        email: input.email,
      })
      ownerId = owner.id
    }

    const merchant = await createCatalogMerchant({
      merchantOwnerId: ownerId,
      merchantIdOnchain: onchain.merchantId,
      pdaAddress: onchain.merchant,
      pdaPaymentVault: onchain.vault,
      pdaGasVault: onchain.gasVault,
      name: input.name,
      feeBps: input.feeBps,
      posFeeBps: input.posFeeBps,
      minPaymentAmount: String(input.minPaymentAmount),
      isActive: true,
    })

    const terminal = await createTerminal({
      merchantId: merchant.id,
      posTerminalId: input.posTerminalId,
    })

    for (let i = 0; i < input.destinations.length; i++) {
      await createDestination({
        merchantId: merchant.id,
        destinationPubkey: input.destinations[i],
        percentage: input.percentages[i],
        positionIndex: i,
        description: input.labels?.[i],
      })
    }

    response.merchantDbId = merchant.id
    response.terminalDbId = terminal.id
  } catch (error) {
    response.warning = `El comercio se creó on-chain, pero no se pudo guardar en la base: ${(error as Error).message}`
  }

  return NextResponse.json(response)
}

const ownerQuerySchema = z.object({ owner: z.string().min(32) })

// Recupera el comercio de un dueño al iniciar sesión, para que no dependa de
// lo que haya quedado guardado en ese navegador.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const parsed = ownerQuerySchema.safeParse({ owner: params.get("owner") ?? "" })
  if (!parsed.success) {
    return NextResponse.json({ error: "Falta el parámetro owner" }, { status: 400 })
  }

  try {
    const owner = await getMerchantsByOwner(parsed.data.owner)
    return NextResponse.json(owner)
  } catch (error) {
    const status = error instanceof CatalogError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
}
