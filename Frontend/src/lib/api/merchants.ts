export interface UpdateMerchantConfigInput {
  destinations: string[]
  percentages: number[]
  feeBps: number
  posFeeBps: number
  minPaymentAmount: string
}

// El admin es el único que firma esto (la ruta lo relaya con la wallet de
// la plataforma) — el comerciante nunca llega a este endpoint.
export async function updateMerchantConfig(
  address: string,
  input: UpdateMerchantConfigInput
): Promise<{ signature: string }> {
  const res = await fetch(`/api/merchants/${address}/config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || "No se pudo actualizar la configuración del comercio")
  }
  return data
}
