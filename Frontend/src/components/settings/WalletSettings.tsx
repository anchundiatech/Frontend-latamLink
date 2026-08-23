"use client"

import { usePrivy } from "@privy-io/react-auth"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { shortenAddress } from "@/lib/utils"
import { useWalletsVinculadas } from "@/lib/services/useWalletsVinculadas"
import { CheckCircle, Plus, Wallet } from "lucide-react"

// Oculto por ahora para el demo: la función sigue acá, solo no se muestra.
const MOSTRAR_VINCULAR_WALLET = false

export function WalletSettings() {
  const { authenticated, user, login, logout } = usePrivy()
  const { walletAddress } = useMerchantStore()
  const { wallets, vincular } = useWalletsVinculadas()

  // Wallets propias que el comerciante sumó, además de la que le creó la
  // cuenta. Son opcionales y sirven solo para recibir cobros.
  const propias = wallets.filter((w) => !w.esDeLaCuenta)

  return (
    <div className="glass rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-heading text-on-surface mb-1">
          Payment Account
        </h3>
        <p className="text-xs text-on-surface-variant">
          Your account is connected via LatamLink. This is where customers send payments.
        </p>
      </div>

      {authenticated ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 glass rounded-lg">
            <CheckCircle className="w-5 h-5 text-success shrink-0" />
            <div className="text-left min-w-0 flex-1">
              <p className="text-xs text-on-surface-variant">Connected via LatamLink</p>
              <p className="text-sm font-mono text-on-surface truncate">
                {user?.email?.address ?? user?.google?.email ?? "Authenticated"}
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="text-xs text-on-surface-variant hover:text-error transition-colors shrink-0"
            >
              Sign Out
            </button>
          </div>

          {walletAddress ? (
            <div className="flex items-center gap-3 p-3 glass rounded-lg">
              <Wallet className="w-5 h-5 text-on-surface-variant shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-xs text-on-surface-variant">Payment Account Number</p>
                <p className="text-sm font-mono text-on-surface truncate">
                  {shortenAddress(walletAddress, 6)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant/60 text-center py-2">
              Estamos preparando tu cuenta de pago.
            </p>
          )}

          {MOSTRAR_VINCULAR_WALLET && (
            <div className="pt-1 space-y-2">
              <p className="text-xs text-on-surface-variant">
                Si ya usás una billetera propia, podés sumarla para cobrar directo
                ahí. Es opcional: tu cuenta ya funciona sin esto, y nunca vas a
                tener que firmar nada.
              </p>

              {propias.map((w) => (
                <div key={w.address} className="flex items-center gap-3 p-3 glass rounded-lg">
                  <Wallet className="w-5 h-5 text-electric-teal shrink-0" />
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-xs text-on-surface-variant">Billetera propia ({w.cliente})</p>
                    <p className="text-sm font-mono text-on-surface truncate">
                      {shortenAddress(w.address, 6)}
                    </p>
                  </div>
                </div>
              ))}

              <button
                onClick={vincular}
                className="w-full flex items-center justify-center gap-2 glass hover:bg-white/5 text-on-surface font-heading px-4 py-2.5 rounded-default transition-all text-xs"
              >
                <Plus className="w-4 h-4" />
                Vincular mi billetera
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center">
          <button
            onClick={() => login()}
            className="bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium px-6 py-2.5 rounded-default transition-all text-sm"
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  )
}
