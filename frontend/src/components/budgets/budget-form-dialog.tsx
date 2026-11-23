"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MonthInput } from "@/components/shared/month-input"
import { useCategories } from "@/hooks/use-categories"
import { useCreateBudget, useUpdateBudget } from "@/hooks/use-budgets"
import { ApiError, getErrorMessage } from "@/lib/api"
import { apiToMonthInput, monthInputToApi } from "@/lib/dates"
import type { Budget, BudgetCreate, BudgetUpdate } from "@/types"

const amountSchema = z.string().min(1, "Limit is required.").regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a non-negative amount with up to 2 decimals.")
const formSchema = z.object({ category_id: z.string().min(1, "Category is required."), budget_month: z.string().min(1, "Month is required."), limit_amount: amountSchema })
type FormValues = z.infer<typeof formSchema>

export function BudgetFormDialog({ open, onOpenChange, selectedMonth, budget }: { open: boolean; onOpenChange: (open: boolean) => void; selectedMonth: string; budget: Budget | null }) {
  const categories = useCategories()
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const isUpdate = budget !== null
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { category_id: "", budget_month: selectedMonth, limit_amount: "" } })
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = form

  useEffect(() => {
    if (open) reset({ category_id: budget ? String(budget.category_id) : "", budget_month: budget ? apiToMonthInput(budget.budget_month) : selectedMonth, limit_amount: budget?.limit_amount ?? "" })
  }, [budget, open, reset, selectedMonth])

  const onSubmit = async (values: FormValues) => {
    try {
      if (budget) {
        await updateBudget.mutateAsync({ budgetId: budget.budget_id, body: { limit_amount: values.limit_amount } satisfies BudgetUpdate })
      } else {
        await createBudget.mutateAsync({ category_id: Number(values.category_id), budget_month: monthInputToApi(values.budget_month), limit_amount: values.limit_amount } satisfies BudgetCreate)
      }
      onOpenChange(false)
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          if (field === "category_id" || field === "budget_month" || field === "limit_amount") setError(field, { message })
        })
      }
      setError("root", { message: getErrorMessage(error) })
    }
  }

  const pending = createBudget.isPending || updateBudget.isPending
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isUpdate ? "Update budget" : "Add budget"}</DialogTitle>
          <DialogDescription>{isUpdate ? "Change the spending limit for this category and month." : "Set a monthly spending limit for an expense category."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {errors.root?.message && <Alert variant="destructive"><AlertTitle>Could not save budget</AlertTitle><AlertDescription>{errors.root.message}</AlertDescription></Alert>}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-category">Category</Label>
            <Controller control={control} name="category_id" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isUpdate}>
                <SelectTrigger id="budget-category" aria-invalid={Boolean(errors.category_id)} className="w-full"><SelectValue placeholder="Select expense category" /></SelectTrigger>
                <SelectContent><SelectGroup>{categories.expenseCategories.map((category) => <SelectItem key={category.category_id} value={String(category.category_id)}>{category.category_name}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            )} />
            {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-month">Month</Label>
            <MonthInput id="budget-month" disabled={isUpdate} aria-invalid={Boolean(errors.budget_month)} {...register("budget_month")} />
            {errors.budget_month && <p className="text-xs text-destructive">{errors.budget_month.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-limit">Limit amount</Label>
            <Input id="budget-limit" inputMode="decimal" placeholder="0.00" aria-invalid={Boolean(errors.limit_amount)} {...register("limit_amount")} />
            {errors.limit_amount && <p className="text-xs text-destructive">{errors.limit_amount.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2Icon className="animate-spin" data-icon="inline-start" />}{pending ? (isUpdate ? "Saving…" : "Creating…") : (isUpdate ? "Save changes" : "Create budget")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
