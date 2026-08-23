"use client"

import { StatsCards } from "@/components/dashboard/StatsCards"
import { RevenueChart } from "@/components/dashboard/RevenueChart"
import { RecentPayments } from "@/components/dashboard/RecentPayments"
import { TreasurySummary } from "@/components/dashboard/TreasurySummary"

export default function DashboardPage() {
  return (
    <div>
      <div className="space-y-4">
        <StatsCards />
        <div className="grid lg:grid-cols-2 gap-4">
          <RevenueChart />
          <RecentPayments />
        </div>
        <TreasurySummary />
      </div>
    </div>
  )
}
