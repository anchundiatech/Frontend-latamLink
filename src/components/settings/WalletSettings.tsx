"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { CheckCircle, Wallet } from "lucide-react"

export function WalletSettings() {
  const { publicKey, connected, disconnecting } = useWallet()
  const { walletAddress, setWalletAddress } = useMerchantStore()

  const displayAddress = walletAddress || publicKey?.toBase58() || ""

  return (
    <div className="glass rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-heading text-on-surface mb-1">
          Connected Wallet
        </h3>
        <p className="text-xs text-on-surface-variant">
          Link your Solana wallet to receive payments and manage on-chain data.
        </p>
      </div>

      {connected && publicKey ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 glass rounded-lg">
            <CheckCircle className="w-5 h-5 text-success shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-xs text-on-surface-variant">Wallet connected</p>
              <p className="text-sm font-mono text-on-surface truncate">
                {publicKey.toBase58()}
              </p>
            </div>
          </div>
          {displayAddress && displayAddress !== publicKey.toBase58() && (
            <button
              onClick={() => setWalletAddress(publicKey.toBase58())}
              className="w-full text-xs text-electric-purple hover:text-electric-purple/80 transition-colors font-heading text-center"
            >
              Update store with this wallet address
            </button>
          )}
          {!walletAddress && (
            <button
              onClick={() => setWalletAddress(publicKey.toBase58())}
              className="w-full bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium py-2.5 rounded-default transition-all text-sm"
            >
              Set as Payment Wallet
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {walletAddress ? (
            <div className="flex items-center gap-3 p-3 glass rounded-lg">
              <Wallet className="w-5 h-5 text-on-surface-variant shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-xs text-on-surface-variant">Saved wallet</p>
                <p className="text-sm font-mono text-on-surface truncate">
                  {walletAddress}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant/60 text-center py-2">
              No wallet configured. Connect one below.
            </p>
          )}
          <div className="flex justify-center">
            <WalletMultiButton className="!bg-electric-purple !hover:bg-electric-purple/90 !text-white !font-heading !font-medium !px-6 !py-2.5 !rounded-default !transition-all !text-sm" />
          </div>
        </div>
      )}
    </div>
  )
}
