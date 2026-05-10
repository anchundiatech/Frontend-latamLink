"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, XCircle } from "lucide-react"

type PaymentStatusType = "idle" | "pending" | "confirmed" | "failed"

interface PaymentStatusProps {
  status: PaymentStatusType
}

export function PaymentStatus({ status }: PaymentStatusProps) {
  return (
    <AnimatePresence mode="wait">
      {(status === "confirmed" || status === "failed") && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <div className="glass-strong rounded-xl p-8 text-center max-w-sm mx-4">
            {status === "confirmed" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="space-y-4"
              >
                <CheckCircle className="w-12 h-12 text-success mx-auto" />
                <div>
                  <h3 className="text-lg font-heading text-on-surface mb-1">
                    Payment Confirmed!
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    The transaction has been processed successfully.
                  </p>
                </div>
              </motion.div>
            )}

            {status === "failed" && (
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
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
