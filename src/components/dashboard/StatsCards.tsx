"use client"

import { motion } from "framer-motion"
import { DollarSign, Wallet, CreditCard, Activity } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { useMerchantStore } from "@/lib/store/useMerchantStore"
import { useTransactions } from "@/lib/services/useTransactions"

export function StatsCards() {
  const { totalPaymentsReceived, totalVolume, name, isActive, paymentToken } = useMerchantStore()
  const { transactions } = useTransactions()

  const totalRevenue = totalVolume || transactions.reduce((sum, tx) => sum + tx.amount, 0)
  const paymentCount = totalPaymentsReceived || transactions.length

  const stats = [
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      change: `${paymentCount} payments`,
      icon: DollarSign,
      positive: true,
    },
    {
      label: "Payments Received",
      value: String(paymentCount),
      change: "All time",
      icon: CreditCard,
      positive: true,
    },
    {
      label: "Available Balance",
      value: `0.00 ${paymentToken.toUpperCase()}`,
      change: "Connect account to check balance",
      icon: Wallet,
      positive: true,
    },
    {
      label: "POS Status",
      value: isActive ? "Active" : "Inactive",
      change: isActive ? "Online" : "Offline",
      icon: Activity,
      positive: isActive,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-on-surface-variant font-heading uppercase tracking-wider">
              {stat.label}
            </span>
            <div className="w-8 h-8 rounded-lg bg-electric-purple/10 flex items-center justify-center">
              <stat.icon className="w-4 h-4 text-electric-purple" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-heading font-semibold text-on-surface mb-1">
            {stat.value}
          </p>
          <span
            className={cn(
              "text-xs font-heading",
              stat.positive ? "text-success" : "text-error"
            )}
          >
            {stat.change}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
