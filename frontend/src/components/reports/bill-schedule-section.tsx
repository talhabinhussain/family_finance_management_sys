"use client"

import Link from "next/link"
import { DataCard } from "@/components/shared/data-card"
import { Money } from "@/components/shared/money"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/formatters"
import { useBillSchedule } from "@/hooks/use-bills"

export function BillScheduleSection() {
  const query = useBillSchedule(30)

  const action = (
    <Link href="/bills" className={buttonVariants({ variant: "outline", size: "sm" })}>
      Go to Bills
    </Link>
  )

  return (
    <DataCard
      title="Bills"
      description="Bills currently overdue and due within the next 30 days."
      action={action}
      query={query}
      emptyTitle="No bills due"
      emptyDescription="Nothing is overdue or due in the next 30 days."
      isEmpty={(data) => data.overdue.length === 0 && data.upcoming.length === 0}
    >
      {({ overdue, upcoming }) => (
        <div className="flex flex-col gap-6">
          {overdue.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold text-destructive">Overdue Bills</h4>
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdue.map((row) => (
                      <TableRow key={`overdue-${row.bill_id}-${row.due_date}`}>
                        <TableCell className="font-medium">{row.bill_name}</TableCell>
                        <TableCell>{formatDate(row.due_date)}</TableCell>
                        <TableCell className="text-right font-medium">
                          <Money value={row.amount_due} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">
                            {row.days_overdue ?? 0}{" "}
                            {row.days_overdue === 1 ? "day" : "days"} overdue
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold text-foreground">Upcoming Bills (Next 30 Days)</h4>
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Due In</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.map((row) => (
                      <TableRow key={`upcoming-${row.bill_id}-${row.due_date}`}>
                        <TableCell className="font-medium">{row.bill_name}</TableCell>
                        <TableCell>{formatDate(row.due_date)}</TableCell>
                        <TableCell className="text-right font-medium">
                          <Money value={row.amount_due} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {row.days_until_due ?? 0}{" "}
                          {row.days_until_due === 1 ? "day" : "days"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </DataCard>
  )
}
