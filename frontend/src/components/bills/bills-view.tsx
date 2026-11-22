"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { BillFormDialog } from "@/components/bills/bill-form-dialog"
import { BillPaymentDialog } from "@/components/bills/bill-payment-dialog"
import { BillPaymentHistory } from "@/components/bills/bill-payment-history"
import { BillScheduleTable } from "@/components/bills/bill-schedule-table"
import { RegisteredBillsTable } from "@/components/bills/registered-bills-table"
import { useBillSchedule } from "@/hooks/use-bills"
import type { BillDueRow } from "@/types"

export function BillsView() {
  const [daysAhead, setDaysAhead] = useState(30)
  const [payingRow, setPayingRow] = useState<BillDueRow | null>(null)
  const [addBillOpen, setAddBillOpen] = useState(false)
  const schedule = useBillSchedule(daysAhead)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Bills"
        description="Track what is due, record payments and keep the bill list up to date."
        action={<Button onClick={() => setAddBillOpen(true)}><PlusIcon data-icon="inline-start" />Add bill</Button>}
      />
      <BillScheduleTable query={schedule} daysAhead={daysAhead} onDaysAheadChange={setDaysAhead} onRecordPayment={setPayingRow} />
      <BillPaymentHistory />
      <RegisteredBillsTable onAddBill={() => setAddBillOpen(true)} />
      <BillPaymentDialog row={payingRow} onOpenChange={(open) => { if (!open) setPayingRow(null) }} />
      <BillFormDialog open={addBillOpen} onOpenChange={setAddBillOpen} />
    </div>
  )
}
