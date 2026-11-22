"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataState, EmptyState, LoadingState } from "@/components/shared/data-state"
import { Money } from "@/components/shared/money"
import { formatDate } from "@/lib/formatters"
import { useAccounts } from "@/hooks/use-accounts"
import { useCategories } from "@/hooks/use-categories"
import { useMembers } from "@/hooks/use-members"
import type { Expense } from "@/types"

interface ExpenseTableProps {
  query: UseQueryResult<Expense[]>
  hasFilters: boolean
  onAddExpense: () => void
}

export function ExpenseTable({ query, hasFilters, onAddExpense }: ExpenseTableProps) {
  const members = useMembers()
  const categories = useCategories()
  const accounts = useAccounts()

  const emptyContent = hasFilters ? (
    <div className="py-12 text-center text-sm text-muted-foreground">
      No expenses match these filters.
    </div>
  ) : (
    <EmptyState
      title="No expenses yet"
      description="Add your first expense to start tracking spending."
      action={
        <Button onClick={onAddExpense}>
          Add expense
        </Button>
      }
    />
  )

  return (
    <DataState
      query={query}
      loading={<LoadingState rows={6} />}
      empty={emptyContent}
    >
      {(expenses) => (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Date</TableHead>
                <TableHead className="w-[160px]">Member</TableHead>
                <TableHead className="w-[160px]">Category</TableHead>
                <TableHead className="w-[160px]">Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[140px] text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => {
                const member = members.byId.get(expense.member_id)
                const category = categories.byId.get(expense.category_id)
                const account = accounts.byId.get(expense.account_id)

                return (
                  <TableRow key={expense.expense_id}>
                    <TableCell className="font-medium text-foreground">
                      {formatDate(expense.transaction_date)}
                    </TableCell>
                    <TableCell>{member?.full_name ?? "—"}</TableCell>
                    <TableCell>{category?.category_name ?? "—"}</TableCell>
                    <TableCell>{account?.account_name ?? "—"}</TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {expense.description ? (
                        <span title={expense.description}>{expense.description}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Money value={expense.amount} className="text-expense font-medium" />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </DataState>
  )
}
