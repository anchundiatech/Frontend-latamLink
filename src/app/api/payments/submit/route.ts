import { NextResponse } from "next/server"
import { z } from "zod"
import { RelayerError, callRelayer, type SubmittedPayment } from "@/lib/api/relayer"
import { createPayment, getMerchantByPda } from "@/lib/api/catalog"
import { computeSplit } from "@/lib/payments/split"

export const dynamic = "force-dynamic"

const schema = z.object({
  transaction: z.string().min(1),
  reference: z.string().optional(),
})

/**
 * Registra el cobro en PostgreSQL con el mismo desglose que quedó on-chain.
 *
 * El comercio se resuelve por la dirección que devuelve el relayer, no por un
 * identificador que mande el cliente: así nadie puede colgar un cobro del
 * historial de otro comercio. Un fallo al guardar nunca invalida un pago que ya
 * está confirmado en la cadena.
 */
async function registrarPago(payment: SubmittedPayment): Promise<void> {
  const merchant = await getMerchantByPda(payment.merchant)
  const terminal = merchant.terminals?.[0]
  if (!terminal) {
    throw new Error(`El comercio ${merchant.id} no tiene terminales activas`)
  }

  const percentages = (merchant.destinations ?? [])
    .slice()
    .sort((a, b) => a.positionIndex - b.positionIndex)
    .map((d) => d.percentage)

  const { posFee, gasFee, dust } = computeSplit({
    amount: BigInt(payment.amount),
    posFeeBps: merchant.posFeeBps,
    feeBps: merchant.feeBps,
    percentages,
  })

  await createPayment({
    txSignature: payment.signature,
    merchantId: merchant.id,
    posTerminalId: terminal.id,
    payerPubkey: payment.payer,
    amountGross: payment.amount,
    posFee: posFee.toString(),
    gasFee: gasFee.toString(),
    dust: dust.toString(),
    timestamp: new Date().toISOString(),
    status: "CONFIRMED",
  })
}

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

  let result: SubmittedPayment
  try {
    result = await callRelayer<SubmittedPayment>({
      path: "/payments/submit",
      method: "POST",
      body: parsed.data,
      timeoutMs: 90_000,
    })
  } catch (error) {
    const status = error instanceof RelayerError ? error.status : 500
    return NextResponse.json({ error: (error as Error).message }, { status })
  }

  // El dinero ya se movió: si la base falla, se avisa pero el cobro es válido.
  try {
    await registrarPago(result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Pago confirmado pero no registrado en la base:", error)
    return NextResponse.json({
      ...result,
      warning: "El pago se confirmó en la cadena pero no pudo guardarse en el historial",
    })
  }
}
