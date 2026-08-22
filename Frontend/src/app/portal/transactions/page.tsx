"use client"

import { TransactionFilters } from "@/components/transactions/TransactionFilters"
import { TransactionTable } from "@/components/transactions/TransactionTable"
import { Logo } from "@/components/Logo"

export default function TransactionsPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
       
        <div>
          <h1 className="text-headline-lg font-heading text-on-surface">
            Transactions
          </h1>
          <p className="text-xs text-on-surface-variant">
            View all payment transactions
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <TransactionFilters />
        <TransactionTable />
      </div>
    </div>
  )
}
