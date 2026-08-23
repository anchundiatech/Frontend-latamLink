"use client"

import { TransactionFilters } from "@/components/transactions/TransactionFilters"
import { TransactionTable } from "@/components/transactions/TransactionTable"

export default function TransactionsPage() {
  return (
    <div>
      <div className="space-y-4">
        <TransactionFilters />
        <TransactionTable />
      </div>
    </div>
  )
}
