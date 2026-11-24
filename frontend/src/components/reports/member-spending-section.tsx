"use client"

import { useState } from "react"
import { DataCard } from "@/components/shared/data-card"
import { Money } from "@/components/shared/money"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useMemberSpending, type MonthRange } from "@/hooks/use-reports"

const DECIMAL_REGEX = /^\d{1,10}(\.\d{1,2})?$/

export function MemberSpendingSection({ range }: { range: MonthRange }) {
  const [minTotalInput, setMinTotalInput] = useState("")

  const isValidInput = minTotalInput === "" || DECIMAL_REGEX.test(minTotalInput)
  const effectiveMinTotal = isValidInput && minTotalInput ? minTotalInput : undefined

  const query = useMemberSpending(range, effectiveMinTotal)

  const filterAction = (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Label htmlFor="member-min-total" className="text-xs text-muted-foreground whitespace-nowrap">
          Minimum total
        </Label>
        <Input
          id="member-min-total"
          inputMode="decimal"
          placeholder="0.00"
          value={minTotalInput}
          onChange={(e) => setMinTotalInput(e.target.value)}
          className="h-8 w-28 text-right tabular-nums text-xs"
        />
      </div>
      {!isValidInput && (
        <span className="text-[11px] text-destructive">Invalid amount</span>
      )}
    </div>
  )

  return (
    <DataCard
      title="Member spending"
      description="Total expenses logged per household member."
      action={filterAction}
      query={query}
      emptyTitle="No member spending found"
      emptyDescription="Try a different range or a lower minimum total."
      isEmpty={(data) => data.length === 0}
    >
      {(rows) => (
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.member_id}>
                  <TableCell className="font-medium">{row.full_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.expense_count}</TableCell>
                  <TableCell className="text-right font-medium">
                    <Money value={row.total_spending} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DataCard>
  )
}
