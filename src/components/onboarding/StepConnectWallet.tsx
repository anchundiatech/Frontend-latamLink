"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { motion } from "framer-motion"
import { Wallet, ArrowRight, Loader2, CheckCircle } from "lucide-react"

export function StepConnectWallet({ onNext }: { onNext: () => void }) {
  const { connected, connecting, publicKey } = useWallet()

  return (
    <div className="glass-strong rounded-xl p-8 space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-16 h-16 rounded-xl bg-electric-purple/10 flex items-center justify-center mx-auto"
      >
        <Wallet className="w-8 h-8 text-electric-purple" />
      </motion.div>
      <div className="text-center">
        <h2 className="text-headline-lg font-heading text-on-surface mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-sm text-on-surface-variant">
          Link your Solana wallet to create your on-chain merchant account.
        </p>
      </div>

      <div className="flex justify-center">
        <WalletMultiButton className="!bg-electric-purple !hover:bg-electric-purple/90 !text-white !font-heading !font-medium !px-6 !py-3 !rounded-default !transition-all !text-sm" />
      </div>

      {connecting && (
        <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant">
          <Loader2 className="w-4 h-4 animate-spin" />
          Connecting...
        </div>
      )}

      {connected && publicKey && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="glass rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-success shrink-0" />
            <div className="text-left">
              <p className="text-xs text-on-surface-variant">Connected Wallet</p>
              <p className="text-sm font-mono text-on-surface break-all">
                {publicKey.toBase58()}
              </p>
            </div>
          </div>
          <button
            onClick={onNext}
            className="w-full flex items-center justify-center gap-2 bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium px-6 py-3 rounded-default transition-all duration-200 text-sm"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </div>
  )
}
