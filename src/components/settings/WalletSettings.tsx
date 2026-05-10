"use client"

import { usePrivy } from "@privy-io/react-auth"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { CheckCircle, Wallet } from "lucide-react"

export function WalletSettings() {
  const { authenticated, user, login, logout } = usePrivy()
  const { walletAddress, setWalletAddress } = useMerchantStore()

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
              Disconnect
            </button>
          </div>

          {walletAddress ? (
            <div className="flex items-center gap-3 p-3 glass rounded-lg">
              <Wallet className="w-5 h-5 text-on-surface-variant shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-xs text-on-surface-variant">Account ID</p>
                <p className="text-sm font-mono text-on-surface truncate">
                  {walletAddress}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant/60 text-center py-2">
              No payment address set yet. Complete onboarding to configure one.
            </p>
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
