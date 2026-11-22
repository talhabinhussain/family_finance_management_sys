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
import { todayISO } from "@/lib/dates"
import { useAccounts } from "@/hooks/use-accounts"
import { useCategories } from "@/hooks/use-categories"
import { useCreateIncome } from "@/hooks/use-income"
import { useIncomeSources } from "@/hooks/use-income-sources"
import { useMembers } from "@/hooks/use-members"
import type { IncomeCreate } from "@/types"

const incomeFormSchema = z.object({
  member_id: z
    .number({ message: "Member is required" })
    .int()
    .positive("Member is required"),
  account_id: z
    .number({ message: "Account is required" })
    .int()
    .positive("Account is required"),
  income_source_id: z
    .number({ message: "Income source is required" })
    .int()
    .positive("Income source is required"),
  category_id: z
    .number({ message: "Category is required" })
    .int()
    .positive("Category is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a valid amount (up to 10 digits, 2 decimals)")
    .refine((val) => Number(val) > 0, "Amount must be greater than 0"),
  transaction_date: z.string().min(1, "Transaction date is required"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
})

type IncomeFormData = z.infer<typeof incomeFormSchema>

interface IncomeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IncomeFormDialog({ open, onOpenChange }: IncomeFormDialogProps) {
  const membersQuery = useMembers()
  const categoriesQuery = useCategories()
  const accountsQuery = useAccounts()
  const incomeSourcesQuery = useIncomeSources()
  const createIncome = useCreateIncome()

  const activeMembers = (membersQuery.data ?? []).filter((m) => m.is_active)
  const incomeCategories = categoriesQuery.incomeCategories
  const accounts = accountsQuery.data ?? []
  const incomeSources = incomeSourcesQuery.data ?? []

  const defaultValues = {
    member_id: undefined as unknown as number,
    account_id: undefined as unknown as number,
    income_source_id: undefined as unknown as number,
    category_id: undefined as unknown as number,
    amount: "",
    transaction_date: "",
    description: "",
  }

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      setValue("transaction_date", todayISO())
    }
  }, [open, setValue])

  const handleClose = () => {
    reset(defaultValues)
    clearErrors()
    onOpenChange(false)
  }

  const onSubmit = async (values: IncomeFormData) => {
    clearErrors("root")
    try {
      const payload: IncomeCreate = {
        member_id: values.member_id,
        account_id: values.account_id,
        income_source_id: values.income_source_id,
        category_id: values.category_id,
        amount: values.amount,
        transaction_date: values.transaction_date,
        description: values.description?.trim() ? values.description.trim() : null,
      }
      await createIncome.mutateAsync(payload)
      handleClose()
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fieldErrors) {
          for (const [field, msg] of Object.entries(error.fieldErrors)) {
            if (field in values) {
              setError(field as keyof IncomeFormData, { message: msg })
            }
          }
        }
        setError("root", { message: error.message })
      } else {
        setError("root", { message: getErrorMessage(error) })
      }
    }
  }

  const isPending = isSubmitting || createIncome.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleClose()
        } else {
          onOpenChange(true)
        }
      }}
    >
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 gap-5">
        <DialogHeader>
          <DialogTitle>Add Income</DialogTitle>
          <DialogDescription>
            Record income received. This credits the selected account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {errors.root?.message && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="income-member">Member</Label>
              <Controller
                control={control}
                name="member_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                  >
                    <SelectTrigger id="income-member" className="w-full" aria-invalid={Boolean(errors.member_id)}>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeMembers.map((member) => (
                        <SelectItem key={member.member_id} value={String(member.member_id)}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.member_id && (
                <p className="text-xs text-destructive">{errors.member_id.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="income-account">Account</Label>
              <Controller
                control={control}
                name="account_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                  >
                    <SelectTrigger id="income-account" className="w-full" aria-invalid={Boolean(errors.account_id)}>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => {
                        const hasTypeInName = account.account_name
                          .toLowerCase()
                          .includes(account.account_type.toLowerCase())
                        const label = hasTypeInName
                          ? account.account_name
                          : `${account.account_name} (${account.account_type})`

                        return (
                          <SelectItem key={account.account_id} value={String(account.account_id)}>
                            {label}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.account_id && (
                <p className="text-xs text-destructive">{errors.account_id.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="income-source">Income source</Label>
              <Controller
                control={control}
                name="income_source_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                  >
                    <SelectTrigger id="income-source" className="w-full" aria-invalid={Boolean(errors.income_source_id)}>
                      <SelectValue placeholder="Select income source" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeSources.map((source) => (
                        <SelectItem key={source.income_source_id} value={String(source.income_source_id)}>
                          {source.source_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.income_source_id && (
                <p className="text-xs text-destructive">{errors.income_source_id.message}</p>
              )}
              {!incomeSourcesQuery.isLoading && incomeSources.length === 0 && (
                <p className="text-xs text-muted-foreground">No income sources yet.</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="income-category">Category</Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => field.onChange(val ? Number(val) : undefined)}
                  >
                    <SelectTrigger id="income-category" className="w-full" aria-invalid={Boolean(errors.category_id)}>
                      <SelectValue placeholder="Select income category" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeCategories.map((category) => (
                        <SelectItem key={category.category_id} value={String(category.category_id)}>
                          {category.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category_id && (
                <p className="text-xs text-destructive">{errors.category_id.message}</p>
              )}
              {!categoriesQuery.isLoading && incomeCategories.length === 0 && (
                <p className="text-xs text-muted-foreground">No income categories yet.</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="income-amount">Amount (PKR)</Label>
              <Input
                id="income-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                {...register("amount")}
                aria-invalid={Boolean(errors.amount)}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="income-date">Date</Label>
              <Input
                id="income-date"
                type="date"
                {...register("transaction_date")}
                aria-invalid={Boolean(errors.transaction_date)}
              />
              {errors.transaction_date && (
                <p className="text-xs text-destructive">{errors.transaction_date.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="income-description">Description (optional)</Label>
              <Input
                id="income-description"
                type="text"
                placeholder="What was this income from?"
                {...register("description")}
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="-mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-4 rounded-b-xl border-t bg-muted/50" showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Add income"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
