"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import {
  ShieldCheck,
  Landmark,
  Store,
  ArrowLeftRight,
  DollarSign,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Percent,
} from "lucide-react"
import { Connection } from "@solana/web3.js"
import { fetchAllMerchantAccounts } from "@/lib/anchor/client"
import { getTreasuryStatus, type TreasuryStatus } from "@/lib/actions/treasuryStatus"
import { shortenAddress, formatCurrency } from "@/lib/utils"
import { config } from "@/lib/config"
import { MerchantFeeEditor, type EditableMerchant } from "@/components/admin/MerchantFeeEditor"

const connection = new Connection(config.rpcEndpoint, "confirmed")

interface MerchantRow {
  address: string
  terminalId: string
  owner: string
  payments: number
  volume: number
  earnings: number
  isActive: boolean
  destinations: string[]
  percentages: number[]
  minPaymentAmount: string
  feeBps: number
  posFeeBps: number
}

interface PlatformStats {
  merchants: number
  transactions: number
  volume: number
  earnings: number
  rows: MerchantRow[]
}

export default function AdminPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [treasury, setTreasury] = useState<TreasuryStatus>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [editingMerchant, setEditingMerchant] = useState<EditableMerchant | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [merchants, treasuryStatus] = await Promise.all([
        fetchAllMerchantAccounts(connection).catch(() => []),
        getTreasuryStatus(),
      ])

      const rows: MerchantRow[] = merchants.map(({ publicKey, account }) => {
        const volume = Number(account.totalVolume?.toString() ?? 0) / 1_000_000
        const feeBps = (account.feeBps ?? 0) + (account.posFeeBps ?? 0)
        return {
          address: publicKey.toBase58(),
          terminalId: account.posTerminalId || "—",
          owner: account.owner.toBase58(),
          payments: Number(account.totalPaymentsReceived?.toString() ?? 0),
          volume,
          earnings: (volume * feeBps) / 10_000,
          isActive: account.isActive,
          destinations: account.destinations.map((d) => d.toBase58()),
          percentages: account.percentages,
          minPaymentAmount: account.minPaymentAmount.toString(),
          feeBps: account.feeBps ?? 0,
          posFeeBps: account.posFeeBps ?? 0,
        }
      })

      setStats({
        merchants: rows.length,
        transactions: rows.reduce((s, r) => s + r.payments, 0),
        volume: rows.reduce((s, r) => s + r.volume, 0),
        earnings: rows.reduce((s, r) => s + r.earnings, 0),
        rows: rows.sort((a, b) => b.volume - a.volume),
      })
      setTreasury(treasuryStatus)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const copyTreasury = () => {
    if (!treasury) return
    navigator.clipboard.writeText(treasury.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cards = [
    {
      label: "Platform Earnings",
      value: stats ? formatCurrency(stats.earnings) : "—",
      hint: "Estimated from on-chain fees",
      icon: DollarSign,
    },
    {
      label: "Total Transactions",
      value: stats ? String(stats.transactions) : "—",
      hint: "Across all merchants",
      icon: ArrowLeftRight,
    },
    {
      label: "Processed Volume",
      value: stats ? formatCurrency(stats.volume) : "—",
      hint: "All time",
      icon: Store,
    },
    {
      label: "Registered Merchants",
      value: stats ? String(stats.merchants) : "—",
      hint: "On-chain accounts",
      icon: ShieldCheck,
    },
  ]

  const lowTreasury = treasury !== null && treasury.onboardingsLeft < 10

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section id="overview">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-heading font-medium text-on-surface-variant uppercase tracking-wider">
            Overview
          </h2>
          <button
            onClick={load}
            disabled={loading}
            aria-label="Refresh data"
            className="flex items-center gap-1.5 text-xs text-electric-purple hover:text-electric-purple/80 disabled:opacity-50 transition-colors p-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-on-surface-variant font-heading uppercase tracking-wider">
                  {card.label}
                </span>
                <div className="w-8 h-8 rounded-lg bg-electric-purple/10 flex items-center justify-center shrink-0">
                  <card.icon className="w-4 h-4 text-electric-purple" />
                </div>
              </div>
              {loading && !stats ? (
                <div className="h-7 w-24 rounded bg-white/5 animate-pulse" />
              ) : (
                <p className="text-lg sm:text-xl font-heading font-semibold text-on-surface mb-1">
                  {card.value}
                </p>
              )}
              <span className="text-xs text-on-surface-variant">{card.hint}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="treasury">
        <h2 className="text-xs font-heading font-medium text-on-surface-variant uppercase tracking-wider mb-3">
          Treasury
        </h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-lg p-4 sm:p-6"
        >
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="w-4 h-4 text-electric-teal" />
            <h3 className="text-sm font-heading font-medium text-on-surface">
              Platform Treasury
            </h3>
            {lowTreasury && (
              <span className="flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                Low balance
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mb-4">
            The wallet that sponsors gas so merchants never need to hold SOL.
          </p>

          {treasury === null ? (
            <p className="text-xs text-on-surface-variant">
              {loading ? "Loading..." : "Treasury not configured (TREASURY_SECRET_KEY missing)."}
            </p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Address</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-on-surface">
                    {shortenAddress(treasury.address, 6)}
                  </span>
                  <button
                    onClick={copyTreasury}
                    aria-label="Copy treasury address"
                    className="text-on-surface-variant hover:text-on-surface transition-colors p-1 cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Balance</p>
                <p className="text-sm font-heading text-on-surface">
                  {treasury.sol.toFixed(4)} SOL
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Sponsored onboardings left</p>
                <p className={`text-sm font-heading ${lowTreasury ? "text-warning" : "text-on-surface"}`}>
                  ~{treasury.onboardingsLeft}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      <section id="merchants">
        <h2 className="text-xs font-heading font-medium text-on-surface-variant uppercase tracking-wider mb-3">
          Merchants
        </h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-lg overflow-hidden"
        >
          {loading && !stats ? (
            <div className="p-6 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 rounded bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : !stats || stats.rows.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-8">
              No on-chain merchant accounts yet. Merchants appear here after their
              first Split Routing setup.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider">
                      Terminal
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider hidden md:table-cell">
                      Owner
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider hidden sm:table-cell">
                      Payments
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider">
                      Volume
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider">
                      Earnings
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-heading text-on-surface-variant uppercase tracking-wider">
                      Fees
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.rows.map((row) => (
                    <tr key={row.address} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-sm font-mono text-on-surface">
                        {row.terminalId}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-on-surface-variant hidden md:table-cell">
                        {shortenAddress(row.owner, 4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface hidden sm:table-cell">
                        {row.payments}
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface">
                        {formatCurrency(row.volume)}
                      </td>
                      <td className="px-4 py-3 text-sm text-success">
                        {formatCurrency(row.earnings)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-heading px-2 py-0.5 rounded ${
                            row.isActive
                              ? "text-success bg-success/10"
                              : "text-on-surface-variant bg-white/5"
                          }`}
                        >
                          {row.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            setEditingMerchant({
                              address: row.address,
                              terminalId: row.terminalId,
                              destinations: row.destinations,
                              percentages: row.percentages,
                              minPaymentAmount: row.minPaymentAmount,
                              feeBps: row.feeBps,
                              posFeeBps: row.posFeeBps,
                            })
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-heading text-electric-purple hover:text-electric-purple/80 transition-colors cursor-pointer"
                        >
                          <Percent className="w-3 h-3" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </section>

      <MerchantFeeEditor
        merchant={editingMerchant}
        onOpenChange={(open) => !open && setEditingMerchant(null)}
        onSaved={load}
      />
    </div>
  )
}
