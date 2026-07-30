"use client"

import { motion } from "framer-motion"
import { CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react"
import { shortenAddress, formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { useTransactions } from "@/lib/services/useTransactions"
import { useMerchantStore } from "@/lib/store/useMerchantStore"

export function RecentPayments() {
  const { transactions, loading, refresh } = useTransactions()
  const { totalPaymentsReceived, totalVolume } = useMerchantStore()
  const recent = transactions.slice(0, 5)

  if (!recent.length && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-lg p-4 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-heading font-medium text-on-surface">
            Recent Payments
          </h3>
          <button
            onClick={refresh}
            className="flex items-center gap-1 text-xs text-electric-purple hover:text-electric-purple/80 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
        <div className="text-center py-6 space-y-2">
          <AlertCircle className="w-6 h-6 text-on-surface-variant mx-auto" />
          <p className="text-xs text-on-surface-variant">
            {totalPaymentsReceived > 0
              ? `${totalPaymentsReceived} total payments`
              : "No recent payments"}
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass rounded-lg p-4 sm:p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-medium text-on-surface">
          Recent Payments
        </h3>
        <button
          onClick={refresh}
          className="flex items-center gap-1 text-xs text-electric-purple hover:text-electric-purple/80 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>
      <div className="space-y-2">
        {recent.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  payment.status === "confirmed"
                    ? "bg-success/10"
                    : "bg-warning/10"
                )}
              >
                {payment.status === "confirmed" ? (
                  <CheckCircle className="w-4 h-4 text-success" />
                ) : (
                  <Clock className="w-4 h-4 text-warning" />
                )}
              </div>
              <div>
                <p className="text-sm font-heading text-on-surface">
                  {payment.amount.toFixed(4)} {payment.token}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {shortenAddress(payment.payer, 4)} •{" "}
                  {formatDate(payment.date)}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "text-xs font-heading px-2 py-1 rounded",
                payment.status === "confirmed"
                  ? "text-success bg-success/10"
                  : "text-warning bg-warning/10"
              )}
            >
              {payment.status === "confirmed" ? "Completed" : "Processing"}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
