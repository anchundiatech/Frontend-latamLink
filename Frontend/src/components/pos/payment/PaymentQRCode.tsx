"use client"

import { QRCodeSVG } from "qrcode.react"
import { motion } from "framer-motion"
import { Copy, Check, ExternalLink } from "lucide-react"
import { useState } from "react"
import { shortenAddress } from "@/lib/utils"

interface PaymentQRCodeProps {
  amount: string
  token: string
  cryptoAmount?: number | null
  solanaPayUrl: string | null
  recipientAddress: string
  size?: number
}

export function PaymentQRCode({
  amount,
  token,
  cryptoAmount,
  solanaPayUrl,
  recipientAddress,
  size = 220,
}: PaymentQRCodeProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!solanaPayUrl) return
    navigator.clipboard.writeText(solanaPayUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center space-y-6"
    >
      <div className="text-center">
        <p className="text-xs text-on-surface-variant font-heading uppercase tracking-wider mb-1">
          Scan to Pay
        </p>
        <p className="text-headline-lg font-heading text-on-surface">
          ${parseFloat(amount).toFixed(2)}
        </p>
        {token === "sol" && cryptoAmount != null && (
          <p className="text-xs text-on-surface-variant mt-1">
            ≈ {cryptoAmount.toFixed(4)} SOL at today&apos;s rate
          </p>
        )}
      </div>

      <div className="glass-strong rounded-xl p-6">
        {solanaPayUrl ? (
          <div className="bg-white p-3 rounded-lg">
            <QRCodeSVG
              value={solanaPayUrl}
              size={size}
              bgColor="#ffffff"
              fgColor="#0f111a"
              level="M"
            />
          </div>
        ) : (
          <div className="w-55 h-55 flex items-center justify-center">
            <p className="text-xs text-on-surface-variant">Generating QR...</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="glass rounded-lg px-3 py-2 max-w-55 truncate">
          <span className="text-xs font-mono text-on-surface-variant">
            {shortenAddress(recipientAddress)}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="glass glass-hover rounded-lg p-2 transition-all relative group"
          title="Copy payment link"
          aria-label="Copy payment link"
        >
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4 text-on-surface-variant" />
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-on-surface-variant text-center max-w-xs">
          Customer scans this QR code with their phone to pay.
        </p>
        {solanaPayUrl && (
          <a
            href={solanaPayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-electric-purple hover:text-electric-purple/80 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Open payment link
          </a>
        )}
      </div>
    </motion.div>
  )
}
