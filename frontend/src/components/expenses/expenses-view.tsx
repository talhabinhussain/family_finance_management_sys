"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { ExpenseFilters } from "@/components/expenses/expense-filters"
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog"
import { ExpenseTable } from "@/components/expenses/expense-table"
import { useExpenses, type ExpenseFilters as Filters } from "@/hooks/use-expenses"

export function ExpensesView() {
  const [filters, setFilters] = useState<Filters>({})
  const [dialogOpen, setDialogOpen] = useState(false)

  const expensesQuery = useExpenses(filters)

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
        title="Expenses"
        description="Filter and track family expenses, record transactions, and monitor category budgets."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon className="size-4 mr-1.5" />
            Add expense
          </Button>
        }
      />

      <ExpenseFilters
        filters={filters}
        onFilterChange={setFilters}
        onClear={handleClearFilters}
      />

      <ExpenseTable
        query={expensesQuery}
        hasFilters={hasFilters}
        onAddExpense={() => setDialogOpen(true)}
      />

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
