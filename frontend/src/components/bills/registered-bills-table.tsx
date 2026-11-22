"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { useCategories } from "@/hooks/use-categories"
import { useBills, useSetBillActive } from "@/hooks/use-bills"

export function RegisteredBillsTable({ onAddBill }: { onAddBill: () => void }) {
  const bills = useBills()
  const categories = useCategories()
  const setBillActive = useSetBillActive()

  return (
    <section className="flex flex-col gap-4" aria-labelledby="registered-bills-heading">
      <h2 id="registered-bills-heading" className="text-lg font-medium">Registered bills</h2>
      <DataState
        query={bills}
        loading={<LoadingState rows={4} />}
        empty={
          <EmptyState
            title="No bills yet"
            description="Add a bill to start tracking due dates."
            action={<Button onClick={onAddBill}>Add bill</Button>}
          />
        }
      >
        {(billRows) => (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Recurrence</TableHead>
                  <TableHead>First due date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billRows.map((bill) => {
                  const isPending = setBillActive.isPending && setBillActive.variables?.billId === bill.bill_id

                  return (
                    <TableRow key={bill.bill_id}>
                      <TableCell>{bill.bill_name}</TableCell>
                      <TableCell>{categories.byId.get(bill.category_id)?.category_name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Money value={bill.amount_due} />
                      </TableCell>
                      <TableCell>{bill.recurrence}</TableCell>
                      <TableCell>{formatDate(bill.due_date)}</TableCell>
                      <TableCell>
                        <Badge variant={bill.is_active ? "secondary" : "outline"}>
                          {bill.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => setBillActive.mutate({ billId: bill.bill_id, isActive: !bill.is_active })}
                        >
                          {bill.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DataState>
    </section>
  )
}
