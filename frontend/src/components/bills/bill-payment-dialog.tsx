"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ApiError, getErrorMessage } from "@/lib/api"
import { formatDate, formatMonth, formatMoney } from "@/lib/formatters"
import { todayISO } from "@/lib/dates"
import { useAccounts } from "@/hooks/use-accounts"
import { useCategories } from "@/hooks/use-categories"
import { useCreateBillPayment } from "@/hooks/use-bill-payments"
import { useMembers } from "@/hooks/use-members"
import type { BillDueRow, BillPaymentCreate } from "@/types"

const billPaymentSchema = z.object({
  member_id: z.number({ message: "Member is required" }).int().positive("Member is required"),
  account_id: z.number({ message: "Account is required" }).int().positive("Account is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a valid amount (up to 10 digits, 2 decimals)")
    .refine((value) => Number(value) > 0, "Amount must be greater than 0"),
  transaction_date: z.string().min(1, "Transaction date is required"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
})

type BillPaymentFormData = z.infer<typeof billPaymentSchema>

interface BillPaymentDialogProps {
  row: BillDueRow | null
  onOpenChange: (open: boolean) => void
}

const emptyValues = {
  member_id: undefined as unknown as number,
  account_id: undefined as unknown as number,
  amount: "",
  transaction_date: "",
  description: "",
}

export function BillPaymentDialog({ row, onOpenChange }: BillPaymentDialogProps) {
  const members = useMembers()
  const accounts = useAccounts()
  const categories = useCategories()
  const createPayment = useCreateBillPayment()
  const activeMembers = (members.data ?? []).filter((member) => member.is_active)
  const open = row !== null

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<BillPaymentFormData>({
    resolver: zodResolver(billPaymentSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (row) {
      reset({
        ...emptyValues,
        amount: row.amount_due,
        transaction_date: todayISO(),
      })
      clearErrors()
    }
  }, [row, reset, clearErrors])

  const handleClose = () => {
    reset(emptyValues)
    clearErrors()
    onOpenChange(false)
  }

  const onSubmit = async (values: BillPaymentFormData) => {
    if (!row) return
    clearErrors("root")
    const body: BillPaymentCreate = {
      member_id: values.member_id,
      account_id: values.account_id,
      bill_id: row.bill_id,
      category_id: row.category_id,
      amount: values.amount,
      transaction_date: values.transaction_date,
      period_month: row.period_month,
      description: values.description?.trim() ? values.description.trim() : null,
    }

    try {
      await createPayment.mutateAsync(body)
      handleClose()
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in values) {
            setError(field as keyof BillPaymentFormData, { message })
          }
        }
      }
      setError("root", { message: error instanceof ApiError ? error.message : getErrorMessage(error) })
    }
  }

  const isPending = isSubmitting || createPayment.isPending
  const categoryName = row ? categories.byId.get(row.category_id)?.category_name ?? "—" : "—"

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose()
        else onOpenChange(true)
      }}
    >
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 gap-5">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {row
              ? `Paying ${row.bill_name} for ${formatMonth(row.period_month)} (due ${formatDate(row.due_date)}). This debits the selected account.`
              : "Record a bill payment."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {errors.root?.message && (
            <Alert variant="destructive"><AlertDescription>{errors.root.message}</AlertDescription></Alert>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-payment-member">Member</Label>
              <Controller
                control={control}
                name="member_id"
                render={({ field }) => (
                  <Select value={field.value ? String(field.value) : ""} onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}>
                    <SelectTrigger id="bill-payment-member" className="w-full" aria-invalid={Boolean(errors.member_id)}><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent>{activeMembers.map((member) => <SelectItem key={member.member_id} value={String(member.member_id)}>{member.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              />
              {errors.member_id && <p className="text-xs text-destructive">{errors.member_id.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-payment-account">Account</Label>
              <Controller
                control={control}
                name="account_id"
                render={({ field }) => (
                  <Select value={field.value ? String(field.value) : ""} onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}>
                    <SelectTrigger id="bill-payment-account" className="w-full" aria-invalid={Boolean(errors.account_id)}><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>{(accounts.data ?? []).map((account) => { const label = account.account_name.toLowerCase().includes(account.account_type.toLowerCase()) ? account.account_name : `${account.account_name} (${account.account_type})`; return <SelectItem key={account.account_id} value={String(account.account_id)}>{label}</SelectItem> })}</SelectContent>
                  </Select>
                )}
              />
              {errors.account_id && <p className="text-xs text-destructive">{errors.account_id.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-payment-amount">Amount (PKR)</Label>
              <Input id="bill-payment-amount" type="text" inputMode="decimal" {...register("amount")} aria-invalid={Boolean(errors.amount)} />
              <p className="text-xs text-muted-foreground">Bill amount: {row ? formatMoney(row.amount_due) : "—"}</p>
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-payment-date">Date</Label>
              <Input id="bill-payment-date" type="date" {...register("transaction_date")} aria-invalid={Boolean(errors.transaction_date)} />
              {errors.transaction_date && <p className="text-xs text-destructive">{errors.transaction_date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="bill-payment-category">Category</Label>
              <Input id="bill-payment-category" value={categoryName} disabled readOnly />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="bill-payment-description">Description (optional)</Label>
              <Input id="bill-payment-description" {...register("description")} aria-invalid={Boolean(errors.description)} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
          </div>
          <DialogFooter className="-mx-5 -mb-5 p-4 sm:-mx-6 sm:-mb-6" showCloseButton={false}>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? <><Loader2Icon className="animate-spin" />Recording...</> : "Record payment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
