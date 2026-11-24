"use client"

import { useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { ReportFilters } from "@/components/reports/report-filters"
import { IncomeExpenseSection } from "@/components/reports/income-expense-section"
import { CategorySpendingSection } from "@/components/reports/category-spending-section"
import { MemberSpendingSection } from "@/components/reports/member-spending-section"
import { BudgetReportSection } from "@/components/reports/budget-report-section"
import { AccountReconciliationSection } from "@/components/reports/account-reconciliation-section"
import { SavingsProgressSection } from "@/components/reports/savings-progress-section"
import { BillScheduleSection } from "@/components/reports/bill-schedule-section"
import type { MonthRange } from "@/hooks/use-reports"

export function ReportsView() {
  const [range, setRange] = useState<MonthRange>({ start: "", end: "" })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Reports"
        description="Review income, spending, budgets, balances, savings and bills."
      />

      <ReportFilters range={range} onChange={setRange} />

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Spending over time</h3>
          <p className="text-sm text-muted-foreground">
            Uses the month range above. Leave it empty for all time.
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <IncomeExpenseSection range={range} />
          <CategorySpendingSection range={range} />
          <MemberSpendingSection range={range} />
          <BudgetReportSection range={range} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Current position</h3>
          <p className="text-sm text-muted-foreground">
            Not affected by the month range.
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <AccountReconciliationSection />
          <SavingsProgressSection />
          <BillScheduleSection />
        </div>
      </section>
    </div>
  )
}
