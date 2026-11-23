"use client"

import { PencilIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BudgetProgress } from "@/components/budgets/budget-progress"
import { Money } from "@/components/shared/money"
import { formatPercent } from "@/lib/formatters"
import type { BudgetWithActual } from "@/hooks/use-budgets"

export function BudgetsTable({ rows, onEdit, onDelete }: { rows: BudgetWithActual[]; onEdit: (row: BudgetWithActual) => void; onDelete: (row: BudgetWithActual) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Budget limit</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
            <TableHead className="text-right">Used</TableHead>
            <TableHead>Progress / status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ budget, actual }) => (
            <TableRow key={budget.budget_id}>
              <TableCell className="font-medium">{actual.category_name}</TableCell>
              <TableCell className="text-right"><Money value={actual.limit_amount} /></TableCell>
              <TableCell className="text-right"><Money value={actual.actual_amount} /></TableCell>
              <TableCell className="text-right"><Money value={actual.remaining_amount} /></TableCell>
              <TableCell className="text-right tabular-nums">{formatPercent(actual.percent_used)}</TableCell>
              <TableCell><BudgetProgress row={actual} /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit({ budget, actual })} aria-label={`Edit ${actual.category_name} budget`}>
                    <PencilIcon />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete({ budget, actual })} aria-label={`Delete ${actual.category_name} budget`}>
                    <Trash2Icon />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
