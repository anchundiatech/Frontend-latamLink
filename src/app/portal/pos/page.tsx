"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AmountInput } from "@/components/pos/AmountInput"
import { TokenSelector } from "@/components/pos/TokenSelector"
import { QRCodeDisplay } from "@/components/pos/QRCodeDisplay"
import { PaymentStatus } from "@/components/pos/PaymentStatus"
import { PaymentSuccessAnimation } from "@/components/pos/PaymentSuccessAnimation"
import { ArrowLeft } from "lucide-react"
import { useAnchorWallet } from "@solana/wallet-adapter-react"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { Logo } from "@/components/Logo"
import { useSolanaPay } from "@/lib/services/useSolanaPay"

export default function POSPage() {
  const [amount, setAmount] = useState("")
  const [token, setToken] = useState<"usdc" | "sol">("usdc")
  const [step, setStep] = useState<"input" | "qr">("input")
  const [showSuccess, setShowSuccess] = useState(false)
  const { walletAddress, setWalletAddress, name } = useMerchantStore()
  const wallet = useAnchorWallet()
  const { solanaPayUrl, paymentStatus, generateUrl, startWatching, reset } = useSolanaPay()
  const walletConnected = !!(walletAddress || wallet?.publicKey)
  const noWallet = !walletConnected

  const handleGenerateQR = useCallback(() => {
    if (amount && parseFloat(amount) > 0) {
      if (wallet?.publicKey && !walletAddress) {
        setWalletAddress(wallet.publicKey.toBase58())
      }
      const result = generateUrl(parseFloat(amount), token)
      if (!result.solanaPayUrl) return
      setStep("qr")
      startWatching(result.referenceKey)
    }
  }, [amount, token, wallet, walletAddress, setWalletAddress, generateUrl, startWatching])

  const handleSuccessDone = useCallback(() => {
    setShowSuccess(false)
    setStep("input")
    setAmount("")
    reset()
  }, [reset])

  const recipientAddress = walletAddress || wallet?.publicKey.toBase58() || ""

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
    
        <div>
          <h1 className="text-headline-lg font-heading text-on-surface">
            POS Terminal
          </h1>
          <p className="text-xs text-on-surface-variant">
            Accept payments via Solana Pay
          </p>
        </div>
        {step === "qr" && (
          <button
            onClick={() => { setStep("input"); reset() }}
            className="ml-auto flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
        )}
      </div>

      <div className="glass-strong rounded-xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <TokenSelector selected={token} onSelect={setToken} />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-success font-heading">Solana Pay</span>
          </div>
        </div>

        {noWallet && (
          <div className="mb-6 p-3 glass rounded-lg border border-warning/20 text-center">
            <p className="text-xs text-warning font-heading">
              No wallet detected. Connect your Phantom wallet or go to Settings.
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === "input" ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <AmountInput
                amount={amount}
                onAmountChange={setAmount}
                onSubmit={handleGenerateQR}
              />
            </motion.div>
          ) : (
            <motion.div
              key="qr"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <QRCodeDisplay
                amount={amount}
                token={token}
                solanaPayUrl={solanaPayUrl}
                recipientAddress={recipientAddress}
              />
              <div className="mt-6 p-4 glass rounded-xl text-center">
                {paymentStatus === "pending" ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-electric-purple border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-on-surface-variant">
                      Scanning the network for the transaction...
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-on-surface-variant">
                      Customer scans this QR with their Solana wallet to pay.
                    </p>
                    <p className="text-xs text-on-surface-variant/60 mt-1">
                      Compatible with Phantom, Solflare, and any Solana Pay wallet
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PaymentStatus status={paymentStatus} />
      {paymentStatus === "confirmed" && (
        <PaymentSuccessAnimation onDone={handleSuccessDone} />
      )}
    </div>
  )
}
