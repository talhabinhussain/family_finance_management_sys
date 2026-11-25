"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { MonthInput } from "@/components/shared/month-input"
import { PageHeader } from "@/components/shared/page-header"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { TrendCard } from "@/components/dashboard/trend-card"
import { BudgetAlertsCard } from "@/components/dashboard/budget-alerts-card"
import { CategorySnapshotCard } from "@/components/dashboard/category-snapshot-card"
import { BillsSnapshotCard } from "@/components/dashboard/bills-snapshot-card"
import { AccountsCard } from "@/components/dashboard/accounts-card"
import { SavingsSnapshotCard } from "@/components/dashboard/savings-snapshot-card"
import { currentMonthInput } from "@/lib/dates"

export function DashboardView() {
  const [month, setMonth] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setMonth(currentMonthInput())
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMonth(value || currentMonthInput())
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="A quick view of your household finances."
      />

      <Separator />

      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="dashboard-month" className="text-sm font-medium">
          Month
        </Label>
        <MonthInput
          id="dashboard-month"
          value={month}
          onChange={handleMonthChange}
          className="w-auto"
        />
      </div>

      <SummaryCards month={month} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendCard month={month} />
        </div>
        <div className="lg:col-span-1">
          <BudgetAlertsCard month={month} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategorySnapshotCard month={month} />
        <BillsSnapshotCard />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AccountsCard />
        <SavingsSnapshotCard />
      </div>
    </div>
  )
}
