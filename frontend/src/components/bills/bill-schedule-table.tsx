"use client"

import type { UseQueryResult } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { formatDate, formatMonth } from "@/lib/formatters"
import { useCategories } from "@/hooks/use-categories"
import type { BillDueRow } from "@/types"

type BillSchedule = {
  overdue: BillDueRow[]
  upcoming: BillDueRow[]
}

interface BillScheduleTableProps {
  query: UseQueryResult<BillSchedule>
  daysAhead: number
  onDaysAheadChange: (daysAhead: number) => void
  onRecordPayment: (row: BillDueRow) => void
}

function overdueLabel(days: number | null | undefined) {
  if (days === null || days === undefined) return "Overdue"
  return `${days} ${days === 1 ? "day" : "days"} overdue`
}

function upcomingLabel(days: number | null | undefined) {
  if (days === null || days === undefined) return "Upcoming"
  if (days === 0) return "Due today"
  return `In ${days} ${days === 1 ? "day" : "days"}`
}

export function BillScheduleTable({
  query,
  daysAhead,
  onDaysAheadChange,
  onRecordPayment,
}: BillScheduleTableProps) {
  const categories = useCategories()

  return (
    <section className="flex flex-col gap-4" aria-labelledby="bills-schedule-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="bills-schedule-heading" className="text-lg font-medium">Schedule</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="bills-window" className="text-sm text-muted-foreground">
            Upcoming window
          </label>
          <Select
            value={String(daysAhead)}
            onValueChange={(value) => onDaysAheadChange(Number(value))}
          >
            <SelectTrigger id="bills-window" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Next 30 days</SelectItem>
              <SelectItem value="60">Next 60 days</SelectItem>
              <SelectItem value="90">Next 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataState
        query={query}
        loading={<LoadingState rows={4} />}
        empty={
          <EmptyState
            title="No bills due"
            description="Nothing is overdue or due in this window."
          />
        }
        isEmpty={(data) => data.overdue.length === 0 && data.upcoming.length === 0}
      >
        {(data) => {
          const rows = [
            ...data.overdue.map((row) => ({ row, overdue: true })),
            ...data.upcoming.map((row) => ({ row, overdue: false })),
          ]

          return (
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Bill</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ row, overdue }) => (
                    <TableRow key={`${row.bill_id}-${row.period_month}`}>
                      <TableCell>
                        <Badge variant={overdue ? "destructive" : "outline"}>
                          {overdue ? overdueLabel(row.days_overdue) : upcomingLabel(row.days_until_due)}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.bill_name}</TableCell>
                      <TableCell>{formatDate(row.due_date)}</TableCell>
                      <TableCell>{formatMonth(row.period_month)}</TableCell>
                      <TableCell>{categories.byId.get(row.category_id)?.category_name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Money value={row.amount_due} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Record payment for ${row.bill_name}, ${formatMonth(row.period_month)}`}
                          onClick={() => onRecordPayment(row)}
                        >
                          Record payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        }}
      </DataState>
    </section>
  )
}
