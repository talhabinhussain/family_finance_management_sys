"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { IncomeFilters } from "@/components/income/income-filters"
import { IncomeFormDialog } from "@/components/income/income-form-dialog"
import { IncomeTable } from "@/components/income/income-table"
import { useIncome, type IncomeFilterParams } from "@/hooks/use-income"

export function IncomeView() {
  const [filters, setFilters] = useState<IncomeFilterParams>({})
  const [dialogOpen, setDialogOpen] = useState(false)

  const incomeQuery = useIncome(filters)

  const hasFilters = Boolean(
    filters.member_id !== undefined ||
    filters.category_id !== undefined ||
    filters.from !== undefined ||
    filters.to !== undefined
  )

  const handleClearFilters = () => {
    setFilters({})
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Income"
        description="Record household income and see which account it landed in."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add income
          </Button>
        }
      />

      <IncomeFilters
        filters={filters}
        onFilterChange={setFilters}
        onClear={handleClearFilters}
      />

      <IncomeTable
        query={incomeQuery}
        hasFilters={hasFilters}
        onAddIncome={() => setDialogOpen(true)}
      />

      <IncomeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
