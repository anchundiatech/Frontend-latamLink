"use client"

import { useCallback, useState } from "react"
import { Transaction } from "@solana/web3.js"
import { fetchBackendConfig, toMinimalUnits } from "./useBackendConfig"
import { useCuentaDePago } from "./useCuentaDePago"
import { usePrivyWallet } from "./usePrivyWallet"

type Estado = "idle" | "firmando" | "enviando"

/**
 * Retira dinero de la cuenta de pago del comerciante.
 *
 * Los cobros caen en la cuenta que Privy le creó al entrar con Google, y esa
 * cuenta no tiene SOL: sin alguien que pague la red, el comerciante no podría
 * mover su propio dinero. La red la paga la plataforma; la firma la pone él,
 * porque es su plata y la autorización tiene que ser suya.
 */
export function useRetiro() {
  const cuentaDePago = useCuentaDePago()
  const wallet = usePrivyWallet()
  const [estado, setEstado] = useState<Estado>("idle")

  const retirar = useCallback(
    async (params: { destino: string; monto: number }): Promise<{ signature: string }> => {
      if (!cuentaDePago) throw new Error("Todavía estamos preparando tu cuenta de pago")
      if (!wallet) throw new Error("No pudimos acceder a tu cuenta para firmar el retiro")
      if (params.monto <= 0) throw new Error("Ingresá un monto mayor que cero")

      const config = await fetchBackendConfig()
      if (!config.paymentTokenMint) throw new Error("El servicio de pagos no está configurado")

      const build = await fetch("/api/payouts/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerPubkey: cuentaDePago,
          mint: config.paymentTokenMint,
          destination: params.destino.trim(),
          amount: toMinimalUnits(params.monto, config.tokenDecimals),
          decimals: config.tokenDecimals,
        }),
      })
      const armada = await build.json().catch(() => ({}))
      if (!build.ok) throw new Error(armada.error ?? "No se pudo preparar el retiro")

      setEstado("firmando")
      let firmada: Transaction
      try {
        const tx = Transaction.from(Buffer.from(armada.transaction as string, "base64"))
        firmada = await wallet.signTransaction(tx)
      } finally {
        setEstado("idle")
      }

      setEstado("enviando")
      try {
        const res = await fetch("/api/payouts/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction: firmada
              .serialize({ requireAllSignatures: false, verifySignatures: false })
              .toString("base64"),
          }),
        })
        const enviado = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(enviado.error ?? "No se pudo enviar el retiro")
        return enviado as { signature: string }
      } finally {
        setEstado("idle")
      }
    },
    [cuentaDePago, wallet]
  )

  return { retirar, estado }
}
