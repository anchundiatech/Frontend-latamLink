"use client"

import { usePrivy } from "@privy-io/react-auth"
import { useWallets } from "@privy-io/react-auth/solana"
import { useMerchantStore } from "@/lib/store/useMerchantStore"

interface CuentaVinculada {
  type?: string
  chainType?: string
  address?: string
  walletClientType?: string
}

// Privy marca así las wallets que crea él mismo (las embebidas).
const CLIENTES_EMBEBIDOS = new Set(["privy", "privy-v2"])

/**
 * Elige la cuenta de pago del comerciante entre sus cuentas vinculadas.
 *
 * Se prefiere explícitamente la wallet **embebida**: es la que Privy crea al
 * entrar con Google (`createOnLogin: "all-users"`) y la que identifica al
 * comercio. Si el comerciante alguna vez vinculara una wallet externa, tomar la
 * primera Solana que aparezca podría cambiarle la identidad y dejarlo sin su
 * comercio, así que la externa solo se usa como último recurso.
 */
export function elegirCuentaDePago(cuentas: CuentaVinculada[]): string | null {
  const solana = cuentas.filter((c) => c.type === "wallet" && c.chainType === "solana")

  const embebida = solana.find((c) => CLIENTES_EMBEBIDOS.has(c.walletClientType ?? ""))
  return embebida?.address ?? solana[0]?.address ?? null
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
  const { wallets } = useWallets()
  const guardada = useMerchantStore((s) => s.walletAddress)

  // En Privy v3 la wallet de Solana (incluida la embebida) aparece acá, no
  // en user.linkedAccounts — ese solo la refleja bastante después de creada
  // y a veces nunca, dejando al comercio esperando para siempre en el
  // onboarding aunque la wallet ya exista. Mismo criterio que usePrivyWallet.
  const solanaWallets = wallets as unknown as { address: string; standardWallet?: { name?: string } }[]
  const embebidaDelHookDeWallets = solanaWallets.find((w) =>
    w.standardWallet?.name?.toLowerCase().includes("privy")
  )

  const deLaSesion = elegirCuentaDePago((user?.linkedAccounts ?? []) as CuentaVinculada[])

  return embebidaDelHookDeWallets?.address ?? deLaSesion ?? guardada ?? null
}
