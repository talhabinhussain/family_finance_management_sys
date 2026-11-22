"use client"

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
import { formatDate, formatMonth } from "@/lib/formatters"
import { useExpenses } from "@/hooks/use-expenses"
import { useBillPayments } from "@/hooks/use-bill-payments"
import { useBills } from "@/hooks/use-bills"
import { useMembers } from "@/hooks/use-members"
import { useAccounts } from "@/hooks/use-accounts"

export function BillPaymentHistory() {
  const payments = useBillPayments()
  const expenses = useExpenses()
  const bills = useBills()
  const members = useMembers()
  const accounts = useAccounts()

  return (
    <section className="flex flex-col gap-4" aria-labelledby="bill-payment-history-heading">
      <h2 id="bill-payment-history-heading" className="text-lg font-medium">Payment history</h2>
      <DataState
        query={payments}
        loading={<LoadingState rows={4} />}
        empty={
          <EmptyState
            title="No payments yet"
            description="Payments you record against a bill appear here."
          />
        }
      >
        {(paymentRows) => (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Paid on</TableHead>
                  <TableHead>Paid by</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentRows.map((payment) => {
                  const expense = expenses.data?.find((item) => item.expense_id === payment.expense_id)
                  const member = expense ? members.byId.get(expense.member_id) : undefined
                  const account = expense ? accounts.byId.get(expense.account_id) : undefined

                  return (
                    <TableRow key={payment.bill_payment_id}>
                      <TableCell>
                        <Badge variant="outline" className="border-income/30 bg-income/10 text-income">
                          Paid
                        </Badge>
                      </TableCell>
                      <TableCell>{bills.byId.get(payment.bill_id)?.bill_name ?? "—"}</TableCell>
                      <TableCell>{formatMonth(payment.period_month)}</TableCell>
                      <TableCell>{expense ? formatDate(expense.transaction_date) : "—"}</TableCell>
                      <TableCell>{member?.full_name ?? "—"}</TableCell>
                      <TableCell>{account?.account_name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {expense ? (
                          <Money value={expense.amount} className="text-expense font-medium" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
