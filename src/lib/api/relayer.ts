import "server-only"

// Cliente del relayer para usar SOLO desde el servidor. La credencial de
// operador nunca puede llegar al navegador, así que las pantallas hablan con
// las rutas de /api de esta app y estas reenvían al relayer.
const RELAYER_URL = (process.env.RELAYER_URL ?? "http://localhost:3001").replace(/\/$/, "")
const RELAYER_ADMIN_API_KEY = process.env.RELAYER_ADMIN_API_KEY ?? ""

export class RelayerError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "RelayerError"
  }
}

interface RelayerRequest {
  path: string
  method?: "GET" | "POST"
  body?: unknown
  /** Añade la credencial de operador (alta de comercios, conciliación). */
  operator?: boolean
  timeoutMs?: number
}

export async function callRelayer<T>({
  path,
  method = "GET",
  body,
  operator = false,
  timeoutMs = 30_000,
}: RelayerRequest): Promise<T> {
  if (operator && !RELAYER_ADMIN_API_KEY) {
    throw new RelayerError(
      "Falta configurar RELAYER_ADMIN_API_KEY para operar contra el relayer",
      503
    )
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (operator) headers["X-Api-Key"] = RELAYER_ADMIN_API_KEY

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${RELAYER_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    })
  } catch (error) {
    // El relayer caído no puede parecer un error del comercio.
    throw new RelayerError(
      `No se pudo contactar con el servicio de pagos: ${(error as Error).message}`,
      503
    )
  } finally {
    clearTimeout(timer)
  }

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {}

  if (!response.ok) {
    const message =
      typeof payload.error === "string" ? payload.error : "El servicio de pagos rechazó la solicitud"
    throw new RelayerError(message, response.status)
  }

  return payload as T
}

export interface RelayerConfig {
  programId: string
  cluster: string
  relayer: string
  paymentTokenMint: string | null
  tokenDecimals: number
  demoMerchant: string | null
  platformOwner: string | null
  maxDestinations: number
}

export interface CreatedMerchant {
  merchant: string
  merchantId: string
  owner: string
  vault: string
  gasVault: string
  signature: string
}

export interface BuiltTransaction {
  transaction: string
  blockhash: string
  lastValidBlockHeight: number
  amount: string
  merchant: string
}

export interface SubmittedPayment {
  signature: string
  slot: number
  merchant: string
  payer: string
  amount: string
}
