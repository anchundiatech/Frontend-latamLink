"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Clock } from "lucide-react"
import type { PaymentStatus } from "@/lib/payments/paymentStatus"

interface PaymentExpiredProps {
  status: PaymentStatus
  onRetry?: () => void
}

// Distinto de PaymentStatus (falla real): agotar la ventana de espera no
// significa que el pago falló on-chain, solo que no llegó a tiempo — puede
// confirmarse igual más tarde. El mensaje no debe sonar a error irreversible.
export function PaymentExpired({ status, onRetry }: PaymentExpiredProps) {
  return (
    <AnimatePresence mode="wait">
      {status === "expired" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <div className="glass-strong rounded-xl p-8 text-center max-w-sm mx-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="space-y-4"
            >
              <Clock className="w-12 h-12 text-warning mx-auto" />
              <div>
                <h3 className="text-lg font-heading text-on-surface mb-1">
                  QR Code Expired
                </h3>
                <p className="text-sm text-on-surface-variant">
                  The customer didn&apos;t complete the payment in time. Generate a new QR to try again.
                </p>
              </div>
              <button
                onClick={onRetry}
                className="w-full bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium py-3 rounded-default transition-all duration-200 text-sm"
              >
                Generate New QR
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
