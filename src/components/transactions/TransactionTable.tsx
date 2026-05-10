"use client"

import { CheckCircle, Clock, XCircle, ArrowUpRight, RefreshCw, AlertCircle } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { useTransactions } from "@/lib/services/useTransactions"

type TxStatus = "confirmed" | "pending" | "failed"

const statusConfig: Record<TxStatus, { icon: typeof CheckCircle; color: string; bg: string }> = {
  confirmed: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  pending: { icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  failed: { icon: XCircle, color: "text-error", bg: "bg-error/10" },
}

export function TransactionTable() {
  const { transactions, loading, refresh } = useTransactions()

  if (!transactions.length && !loading) {
    return (
      <div className="glass rounded-lg p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-on-surface-variant mx-auto" />
        <p className="text-sm text-on-surface-variant">No transactions found</p>
        <p className="text-xs text-on-surface-variant/60">
          Complete a payment to see it here, or connect a wallet with transaction history.
        </p>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-1.5 text-xs text-electric-purple hover:text-electric-purple/80 transition-colors font-heading"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider">
                Amount
              </th>
              <th className="text-left px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider hidden sm:table-cell">
                Token
              </th>
              <th className="text-left px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider hidden md:table-cell">
                Date
              </th>
              <th className="text-left px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider hidden lg:table-cell">
                Terminal
              </th>
              <th className="text-left px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider hidden lg:table-cell">
                Payer
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const StatusIcon = statusConfig[tx.status].icon
              return (
                <tr
                  key={tx.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-heading text-on-surface">
                      {tx.amount.toFixed(2)} {tx.token}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="text-xs font-heading text-on-surface-variant">
                      {tx.token}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-heading",
                        statusConfig[tx.status].bg,
                        statusConfig[tx.status].color
                      )}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-xs text-on-surface-variant">
                      {formatDate(tx.date)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-xs text-on-surface-variant font-mono">
                      {tx.terminal}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-xs text-on-surface-variant font-mono">
                      {tx.payer}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
        <p className="text-xs text-on-surface-variant">
          {loading ? "Loading..." : `Showing ${transactions.length} transactions`}
        </p>
        <button
          onClick={refresh}
          className="flex items-center gap-1 text-xs text-electric-purple hover:text-electric-purple/80 transition-colors font-heading"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>
    </div>
  )
}
