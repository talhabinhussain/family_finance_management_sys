"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ApiError, getErrorMessage } from "@/lib/api"
import { useCategories } from "@/hooks/use-categories"
import { useCreateBill } from "@/hooks/use-bills"
import type { BillCreate, Recurrence } from "@/types"

const recurrences: Recurrence[] = ["One-time", "Monthly", "Quarterly", "Yearly"]

const billFormSchema = z.object({
  bill_name: z.string().trim().min(1, "Bill name is required").max(100, "Bill name must be 100 characters or less"),
  amount_due: z.string().min(1, "Amount is required").regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a valid amount (up to 10 digits, 2 decimals)").refine((value) => Number(value) > 0, "Amount must be greater than 0"),
  due_date: z.string().min(1, "First due date is required"),
  recurrence: z.string().min(1, "Recurrence is required"),
  category_id: z.number({ message: "Category is required" }).int().positive("Category is required"),
})

type BillFormData = z.infer<typeof billFormSchema>

const defaultValues = {
  bill_name: "",
  amount_due: "",
  due_date: "",
  recurrence: "",
  category_id: undefined as unknown as number,
}

export function BillFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const categories = useCategories()
  const createBill = useCreateBill()
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<BillFormData>({ resolver: zodResolver(billFormSchema), defaultValues })

  useEffect(() => {
    if (open) {
      reset(defaultValues)
      clearErrors()
    }
  }, [open, reset, clearErrors])

  const handleClose = () => {
    reset(defaultValues)
    clearErrors()
    onOpenChange(false)
  }

  const onSubmit = async (values: BillFormData) => {
    clearErrors("root")
    const body: BillCreate = {
      bill_name: values.bill_name.trim(),
      amount_due: values.amount_due,
      due_date: values.due_date,
      recurrence: values.recurrence as Recurrence,
      category_id: values.category_id,
    }
    try {
      await createBill.mutateAsync(body)
      handleClose()
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in values) setError(field as keyof BillFormData, { message })
        }
      }
      setError("root", { message: error instanceof ApiError ? error.message : getErrorMessage(error) })
    }
  }

  const isPending = isSubmitting || createBill.isPending

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : handleClose()}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 gap-5">
        <DialogHeader>
          <DialogTitle>Add bill</DialogTitle>
          <DialogDescription>Register a bill and its first due date.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {errors.root?.message && <Alert variant="destructive"><AlertDescription>{errors.root.message}</AlertDescription></Alert>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="bill-form-name">Bill name</Label>
              <Input id="bill-form-name" {...register("bill_name")} aria-invalid={Boolean(errors.bill_name)} />
              {errors.bill_name && <p className="text-xs text-destructive">{errors.bill_name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-form-amount">Amount due (PKR)</Label>
              <Input id="bill-form-amount" type="text" inputMode="decimal" {...register("amount_due")} aria-invalid={Boolean(errors.amount_due)} />
              {errors.amount_due && <p className="text-xs text-destructive">{errors.amount_due.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-form-date">First due date</Label>
              <Input id="bill-form-date" type="date" {...register("due_date")} aria-invalid={Boolean(errors.due_date)} />
              <p className="text-xs text-muted-foreground">Every later period is generated from this date. A past date creates overdue entries for each missed period.</p>
              {errors.due_date && <p className="text-xs text-destructive">{errors.due_date.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-form-recurrence">Recurrence</Label>
              <Controller control={control} name="recurrence" render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="bill-form-recurrence" className="w-full" aria-invalid={Boolean(errors.recurrence)}><SelectValue placeholder="Select recurrence" /></SelectTrigger><SelectContent>{recurrences.map((recurrence) => <SelectItem key={recurrence} value={recurrence}>{recurrence}</SelectItem>)}</SelectContent></Select>} />
              {errors.recurrence && <p className="text-xs text-destructive">{errors.recurrence.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-form-category">Category</Label>
              <Controller control={control} name="category_id" render={({ field }) => <Select value={field.value ? String(field.value) : ""} onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}><SelectTrigger id="bill-form-category" className="w-full" aria-invalid={Boolean(errors.category_id)}><SelectValue placeholder="Select expense category" /></SelectTrigger><SelectContent>{categories.expenseCategories.map((category) => <SelectItem key={category.category_id} value={String(category.category_id)}>{category.category_name}</SelectItem>)}</SelectContent></Select>} />
              {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
            </div>
          </div>
          <DialogFooter className="-mx-5 -mb-5 p-4 sm:-mx-6 sm:-mb-6" showCloseButton={false}>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? <><Loader2Icon className="animate-spin" />Adding...</> : "Add bill"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
