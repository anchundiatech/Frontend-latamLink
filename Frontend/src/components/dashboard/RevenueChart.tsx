"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { TrendingUp } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useTransactions } from "@/lib/services/useTransactions"

const DAY_MS = 24 * 60 * 60 * 1000
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function RevenueChart() {
  const { transactions, loading } = useTransactions()

  const { data, hasRevenue } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const buckets = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(today.getTime() - (6 - i) * DAY_MS)
      return { name: dayLabels[day.getDay()], start: day.getTime(), revenue: 0 }
    })

    let total = 0
    for (const tx of transactions) {
      if (tx.status !== "confirmed" || tx.amount <= 0) continue
      const t = new Date(tx.date).getTime()
      const bucket = buckets.find((b) => t >= b.start && t < b.start + DAY_MS)
      if (bucket) {
        bucket.revenue += tx.amount
        total += tx.amount
      }
    }

    return {
      data: buckets.map(({ name, revenue }) => ({ name, revenue: Number(revenue.toFixed(2)) })),
      hasRevenue: total > 0,
    }
  }, [transactions])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass rounded-lg p-4 sm:p-6"
    >
      <h3 className="text-sm font-heading font-medium text-on-surface mb-4">
        Revenue (Last 7 Days)
      </h3>

      {loading && transactions.length === 0 ? (
        <div className="h-64 rounded-lg bg-white/[0.02] animate-pulse" />
      ) : !hasRevenue ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-center">
          <TrendingUp className="w-6 h-6 text-on-surface-variant" />
          <p className="text-xs text-on-surface-variant max-w-[240px]">
            No sales in the last 7 days yet. Your revenue will appear here after your first payment.
          </p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9945ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9945ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="name"
                stroke="var(--color-border)"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="var(--color-border)"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-bright)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.25rem",
                  color: "var(--color-text-primary)",
                  fontSize: "0.75rem",
                }}
                labelStyle={{ color: "var(--color-text-primary)" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#9945ff"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#9945ff", stroke: "var(--color-surface-bright)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}
