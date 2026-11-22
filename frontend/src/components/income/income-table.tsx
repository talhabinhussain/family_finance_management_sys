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
import { useIncomeSources } from "@/hooks/use-income-sources"
import { useMembers } from "@/hooks/use-members"
import type { Income } from "@/types"

interface IncomeTableProps {
  query: UseQueryResult<Income[]>
  hasFilters: boolean
  onAddIncome: () => void
}

export function IncomeTable({ query, hasFilters, onAddIncome }: IncomeTableProps) {
  const members = useMembers()
  const incomeSources = useIncomeSources()
  const categories = useCategories()
  const accounts = useAccounts()

  const emptyContent = hasFilters ? (
    <div className="py-12 text-center text-sm text-muted-foreground">
      No income matches these filters.
    </div>
  ) : (
    <EmptyState
      title="No income yet"
      description="Record your first income to start tracking what the household earns."
      action={
        <Button onClick={onAddIncome}>
          Add income
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
      {(incomeList) => (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Date</TableHead>
                <TableHead className="w-[150px]">Member</TableHead>
                <TableHead className="w-[150px]">Source</TableHead>
                <TableHead className="w-[150px]">Category</TableHead>
                <TableHead className="w-[150px]">Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[140px] text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeList.map((income) => {
                const member = members.byId.get(income.member_id)
                const source = incomeSources.byId.get(income.income_source_id)
                const category = categories.byId.get(income.category_id)
                const account = accounts.byId.get(income.account_id)

                return (
                  <TableRow key={income.income_id}>
                    <TableCell className="font-medium text-foreground">
                      {formatDate(income.transaction_date)}
                    </TableCell>
                    <TableCell>{member?.full_name ?? "—"}</TableCell>
                    <TableCell>{source?.source_name ?? "—"}</TableCell>
                    <TableCell>{category?.category_name ?? "—"}</TableCell>
                    <TableCell>{account?.account_name ?? "—"}</TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {income.description ? (
                        <span title={income.description}>{income.description}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Money value={income.amount} className="text-income font-medium" />
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
