"use client"

import { usePrivy } from "@privy-io/react-auth"
import { useMerchantStore } from "@/lib/store/useMerchantStore"

interface CuentaVinculada {
  type?: string
  chainType?: string
  address?: string
}

/**
 * Cuenta de pago del comerciante, tomada de la sesión.
 *
 * El comerciante entra con Google y Privy le crea la cuenta de pago sola, como
 * parte del alta: nunca conecta ni elige una wallet. Por eso la dirección se
 * lee de la sesión autenticada y no de un conector externo — pedirle "conectá
 * tu wallet" sería exponerle una parte del producto que justamente le estamos
 * evitando.
 *
 * Devuelve `null` mientras la sesión todavía se está montando o la cuenta se
 * está creando; eso no es un error del comerciante, solo hay que esperar.
 */
export function useCuentaDePago(): string | null {
  const { user } = usePrivy()
  const guardada = useMerchantStore((s) => s.walletAddress)

  const cuentas = (user?.linkedAccounts ?? []) as CuentaVinculada[]
  const deLaSesion = cuentas.find(
    (c) => c.type === "wallet" && c.chainType === "solana"
  )?.address

  return deLaSesion ?? guardada ?? null
}
