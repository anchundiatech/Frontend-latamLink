"use client"

import { motion, AnimatePresence } from "framer-motion"
import { XCircle } from "lucide-react"
import type { PaymentStatus as PaymentStatusValue } from "@/lib/payments/paymentStatus"

interface PaymentStatusProps {
  status: PaymentStatusValue
  onRetry?: () => void
}

// Failure overlay only — success is handled exclusively by PaymentSuccess and
// timeouts by PaymentExpired, so the merchant never sees two stacked modals.
export function PaymentStatus({ status, onRetry }: PaymentStatusProps) {
  return (
    <AnimatePresence mode="wait">
      {status === "failed" && (
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
              <XCircle className="w-12 h-12 text-error mx-auto" />
              <div>
                <h3 className="text-lg font-heading text-on-surface mb-1">
                  Payment Failed
                </h3>
                <p className="text-sm text-on-surface-variant">
                  The transaction could not be processed. Please try again.
                </p>
              </div>
              <button
                onClick={onRetry}
                className="w-full bg-electric-purple hover:bg-electric-purple/90 text-white font-heading font-medium py-3 rounded-default transition-all duration-200 text-sm"
              >
                Try Again
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
