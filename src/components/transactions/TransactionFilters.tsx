"use client"

import { Calendar, Filter } from "lucide-react"

export function TransactionFilters() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 glass rounded-lg px-3 py-2">
        <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
        <select className="bg-transparent text-xs text-on-surface font-heading focus:outline-none cursor-pointer">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
          <option>All time</option>
        </select>
      </div>
      <div className="flex items-center gap-2 glass rounded-lg px-3 py-2">
        <Filter className="w-3.5 h-3.5 text-on-surface-variant" />
        <select className="bg-transparent text-xs text-on-surface font-heading focus:outline-none cursor-pointer">
          <option>All tokens</option>
          <option>USDC</option>
          <option>SOL</option>
        </select>
      </div>
      <div className="flex items-center gap-2 glass rounded-lg px-3 py-2">
        <Filter className="w-3.5 h-3.5 text-on-surface-variant" />
        <select className="bg-transparent text-xs text-on-surface font-heading focus:outline-none cursor-pointer">
          <option>All status</option>
          <option>Confirmed</option>
          <option>Pending</option>
          <option>Failed</option>
        </select>
      </div>
    </div>
  )
}
