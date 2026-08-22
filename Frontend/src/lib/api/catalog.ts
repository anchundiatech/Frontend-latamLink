import "server-only"

// Cliente de la API de catálogo (PostgreSQL vía Prisma). Solo servidor: la
// credencial de servicio nunca puede llegar al navegador.
const CATALOG_URL = (
  process.env.CATALOG_API_URL ?? `http://localhost:${process.env.API_PORT ?? 3002}`
).replace(/\/$/, "")

const API_KEY = process.env.API_KEY ?? ""
// Solo el relayer puede escribir en el historial de pagos.
const RELAYER_API_KEY = process.env.RELAYER_API_KEY ?? ""

export class CatalogError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "CatalogError"
  }
}

interface CatalogRequest {
  path: string
  method?: "GET" | "POST" | "PATCH"
  body?: unknown
  /** Usa la credencial del relayer (necesaria para registrar pagos). */
  asRelayer?: boolean
  timeoutMs?: number
}

async function callCatalog<T>({
  path,
  method = "GET",
  body,
  asRelayer = false,
  timeoutMs = 15_000,
}: CatalogRequest): Promise<T> {
  const key = asRelayer ? RELAYER_API_KEY : API_KEY || RELAYER_API_KEY
  if (!key) {
    throw new CatalogError(
      "Falta configurar API_KEY (y RELAYER_API_KEY) para hablar con la API de catálogo",
      503
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${CATALOG_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    })
  } catch (error) {
    throw new CatalogError(
      `No se pudo contactar con la base de datos: ${(error as Error).message}`,
      503
    )
  } finally {
    clearTimeout(timer)
  }

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {}

  if (!response.ok) {
    const message =
      typeof payload.message === "string" ? payload.message : "La base de datos rechazó la operación"
    throw new CatalogError(message, response.status)
  }

  return (payload as { data: T }).data
}

// ── Tipos que devuelve la API ──

export interface CatalogOwner {
  id: string
  pubkey: string
  email: string | null
  name: string | null
}

export interface CatalogDestination {
  id: string
  destinationPubkey: string
  percentage: number
  positionIndex: number
  description: string | null
  isActive: boolean
}

export interface CatalogTerminal {
  id: string
  posTerminalId: string
  accessToken: string
  isActive: boolean
}

export interface CatalogMerchant {
  id: string
  merchantOwnerId: string
  merchantIdOnchain: string
  pdaAddress: string
  pdaPaymentVault: string
  pdaGasVault: string
  name: string
  feeBps: number
  posFeeBps: number
  minPaymentAmount: string
  isActive: boolean
  totalVolume: string
  destinations?: CatalogDestination[]
  terminals?: CatalogTerminal[]
}

export interface CatalogPayment {
  id: string
  txSignature: string
  payerPubkey: string
  amountGross: string
  posFee: string
  gasFee: string
  dust: string
  timestamp: string
  status: "PENDING" | "CONFIRMED" | "FAILED"
  terminal?: CatalogTerminal
}

// ── Operaciones ──

export function createOwner(input: {
  pubkey: string
  embeddedWalletPda: string
  email?: string
  name?: string
}): Promise<CatalogOwner> {
  return callCatalog<CatalogOwner>({ path: "/api/merchants", method: "POST", body: input })
}

export function createMerchant(input: {
  merchantOwnerId: string
  merchantIdOnchain: string
  pdaAddress: string
  pdaPaymentVault: string
  pdaGasVault: string
  name: string
  feeBps: number
  posFeeBps: number
  minPaymentAmount: string
  isActive: boolean
}): Promise<CatalogMerchant> {
  return callCatalog<CatalogMerchant>({
    path: "/api/merchants/store",
    method: "POST",
    body: { ...input, totalVolume: "0" },
  })
}

export function createDestination(input: {
  merchantId: string
  destinationPubkey: string
  percentage: number
  positionIndex: number
  description?: string
}): Promise<CatalogDestination> {
  return callCatalog<CatalogDestination>({
    path: "/api/merchants/destination",
    method: "POST",
    body: input,
  })
}

export function createTerminal(input: {
  merchantId: string
  posTerminalId: string
}): Promise<CatalogTerminal> {
  return callCatalog<CatalogTerminal>({
    path: "/api/merchants/terminal",
    method: "POST",
    body: { ...input, isActive: true },
  })
}

export function getMerchant(merchantId: string): Promise<CatalogMerchant> {
  return callCatalog<CatalogMerchant>({ path: `/api/merchants/${merchantId}` })
}

export interface CatalogOwnerWithMerchants extends CatalogOwner {
  merchants: CatalogMerchant[]
}

/** Comercios de un comerciante, buscados por la wallet con la que inicia sesión. */
export function getMerchantsByOwner(pubkey: string): Promise<CatalogOwnerWithMerchants> {
  return callCatalog<CatalogOwnerWithMerchants>({ path: `/api/merchants/owner/${pubkey}` })
}

/** Comercio buscado por su dirección on-chain. */
export function getMerchantByPda(pdaAddress: string): Promise<CatalogMerchant> {
  return callCatalog<CatalogMerchant>({ path: `/api/merchants/pda/${pdaAddress}` })
}

export function createPayment(input: {
  txSignature: string
  merchantId: string
  posTerminalId: string
  payerPubkey: string
  amountGross: string
  posFee: string
  gasFee: string
  dust: string
  timestamp: string
  status: "PENDING" | "CONFIRMED" | "FAILED"
}): Promise<CatalogPayment> {
  return callCatalog<CatalogPayment>({
    path: "/api/merchants/payment",
    method: "POST",
    asRelayer: true,
    body: input,
  })
}

export async function listPayments(
  merchantId: string,
  options?: { limit?: number; offset?: number }
): Promise<CatalogPayment[]> {
  const params = new URLSearchParams()
  if (options?.limit) params.set("limit", String(options.limit))
  if (options?.offset) params.set("offset", String(options.offset))
  const query = params.toString()
  return callCatalog<CatalogPayment[]>({
    path: `/api/merchants/${merchantId}/payments${query ? `?${query}` : ""}`,
  })
}
