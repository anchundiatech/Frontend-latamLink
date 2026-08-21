"use client"

import { StatsCards } from "@/components/dashboard/StatsCards"
import { RevenueChart } from "@/components/dashboard/RevenueChart"
import { RecentPayments } from "@/components/dashboard/RecentPayments"
import { TreasurySummary } from "@/components/dashboard/TreasurySummary"
import { Logo } from "@/components/Logo"

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        
        <div>
          <h1 className="text-headline-lg font-heading text-on-surface">Dashboard</h1>
          <p className="text-xs text-on-surface-variant">
            Your business at a glance
          </p>
        </div>
      </div>

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
