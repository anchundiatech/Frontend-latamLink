"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArrowUpRight, Loader2 } from "lucide-react"
import { useRetiro } from "@/lib/services/useRetiro"
import { useWalletsVinculadas } from "@/lib/services/useWalletsVinculadas"

/**
 * Retirar dinero de la cuenta de pago.
 *
 * Hasta ahora los cobros llegaban a la cuenta que Privy crea con el login y no
 * había forma de sacarlos desde la app: el comerciante veía el saldo pero no
 * podía moverlo. Esta pantalla cierra ese círculo.
 */
export function RetiroSettings() {
  const { retirar, estado } = useRetiro()
  const { wallets } = useWalletsVinculadas()
  const [destino, setDestino] = useState("")
  const [monto, setMonto] = useState("")

  const propias = wallets.filter((w) => !w.esDeLaCuenta)
  const ocupado = estado !== "idle"

  const handleRetirar = async () => {
    const cantidad = parseFloat(monto)
    if (!destino.trim()) {
      toast.error("Indicá a dónde querés enviar el dinero")
      return
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      toast.error("Ingresá un monto válido")
      return
    }

    try {
      const { signature } = await retirar({ destino, monto: cantidad })
      toast.success(`Retiro enviado (${signature.slice(0, 8)}…)`)
      setMonto("")
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="glass rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-heading text-on-surface mb-1">Retirar dinero</h3>
        <p className="text-xs text-on-surface-variant">
          Enviá lo que cobraste a otra billetera. La comisión de red la paga
          LatamLink: no necesitás tener SOL.
        </p>
      </div>

      {propias.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {propias.map((w) => (
            <button
              key={w.address}
              type="button"
              onClick={() => setDestino(w.address)}
              className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[11px] font-mono text-on-surface-variant transition-colors"
            >
              Mi billetera · {w.address.slice(0, 4)}…{w.address.slice(-4)}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <input
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          placeholder="Dirección de destino"
          disabled={ocupado}
          className="w-full bg-surface-container-low border border-white/10 rounded-default px-3 py-2 text-xs font-mono text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-electric-teal/50 disabled:opacity-60"
        />
        <input
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="Monto"
          inputMode="decimal"
          disabled={ocupado}
          className="w-full bg-surface-container-low border border-white/10 rounded-default px-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-electric-teal/50 disabled:opacity-60"
        />
      </div>

      <button
        onClick={handleRetirar}
        disabled={ocupado}
        className="w-full flex items-center justify-center gap-2 bg-electric-teal hover:bg-electric-teal/90 disabled:opacity-50 disabled:cursor-not-allowed text-on-secondary font-heading font-medium px-4 py-2.5 rounded-default transition-all text-sm"
      >
        {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
        {estado === "firmando" ? "Confirmá el retiro…" : estado === "enviando" ? "Enviando…" : "Retirar"}
      </button>
    </div>
  )
}
