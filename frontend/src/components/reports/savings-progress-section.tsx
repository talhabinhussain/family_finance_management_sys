"use client"

import { DataCard } from "@/components/shared/data-card"
import { Money } from "@/components/shared/money"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPercent, toProgress } from "@/lib/formatters"
import { useSavingsProgress } from "@/hooks/use-reports"

export function SavingsProgressSection() {
  const query = useSavingsProgress()

  return (
    <DataCard
      title="Savings progress"
      description="Current accumulation towards family savings targets."
      query={query}
      emptyTitle="No savings goals yet"
      emptyDescription="Create a goal on the Savings page."
      isEmpty={(data) => data.length === 0}
    >
      {(rows) => (
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Goal</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Contributed</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="min-w-44">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.goal_id}>
                  <TableCell className="font-medium">{row.goal_name}</TableCell>
                  <TableCell className="text-right">
                    <Money value={row.target_amount} />
                  </TableCell>
                  <TableCell className="text-right font-medium text-income">
                    <Money value={row.contributed_amount} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money value={row.remaining_amount} />
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-32 items-center gap-3">
                      <Progress
                        value={toProgress(row.completion_percent)}
                        className="min-w-20 flex-1"
                        aria-label={`${formatPercent(row.completion_percent)} completed`}
                      />
                      <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                        {formatPercent(row.completion_percent)}
                      </span>
                    </div>
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
