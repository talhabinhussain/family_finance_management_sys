"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/data-state"
import { MonthInput } from "@/components/shared/month-input"
import { BudgetsTable } from "@/components/budgets/budgets-table"
import { BudgetFormDialog } from "@/components/budgets/budget-form-dialog"
import { useBudgetData, useDeleteBudget, type BudgetWithActual } from "@/hooks/use-budgets"
import { currentMonthInput } from "@/lib/dates"
import { formatMonth } from "@/lib/formatters"

export function BudgetsView() {
  const [month, setMonth] = useState(() => (typeof window === "undefined" ? "" : currentMonthInput()))
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetWithActual | null>(null)
  const [deleting, setDeleting] = useState<BudgetWithActual | null>(null)
  const data = useBudgetData(month)
  const deleteBudget = useDeleteBudget()

  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (row: BudgetWithActual) => { setEditing(row); setFormOpen(true) }
  const closeForm = (open: boolean) => { setFormOpen(open); if (!open) setEditing(null) }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Budgets" description="Plan monthly spending and track your household expenses against your limits." action={<Button onClick={openCreate}><PlusIcon data-icon="inline-start" />Add budget</Button>} />
      <div className="flex items-center gap-3">
        <label htmlFor="budgets-month" className="text-sm font-medium">Month</label>
        <MonthInput id="budgets-month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-auto" />
      </div>
      {data.isPending ? <LoadingState rows={5} /> : data.error ? <ErrorState error={data.error} onRetry={() => void data.refetch()} /> : data.data.length === 0 ? <EmptyState title="No budgets for this month" description="Create a monthly budget for an expense category to start tracking your spending." action={<Button onClick={openCreate}>Add budget</Button>} /> : <BudgetsTable rows={data.data} onEdit={openEdit} onDelete={setDeleting} />}
      <BudgetFormDialog open={formOpen} onOpenChange={closeForm} selectedMonth={month} budget={editing?.budget ?? null} />
      <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete budget?</DialogTitle><DialogDescription>Delete the {deleting?.actual.category_name} budget for {deleting ? formatMonth(deleting.budget.budget_month) : "this month"}? This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteBudget.isPending} onClick={async () => { if (!deleting) return; await deleteBudget.mutateAsync({ budgetId: deleting.budget.budget_id, month }); setDeleting(null) }}>Delete budget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
