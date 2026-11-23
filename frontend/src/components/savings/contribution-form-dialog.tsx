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
import { useMembers } from "@/hooks/use-members"
import { useCreateSavingsContribution } from "@/hooks/use-savings-contributions"
import type { SavingsContributionCreate, SavingsGoal } from "@/types"

const contributionSchema = z.object({
  member_id: z
    .number({ message: "Member is required" })
    .int()
    .positive("Member is required"),
  account_id: z
    .number({ message: "Account is required" })
    .int()
    .positive("Account is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a valid amount (up to 10 digits, 2 decimals)")
    .refine((val) => Number(val) > 0, "Amount must be greater than 0"),
  contribution_date: z.string().min(1, "Contribution date is required"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
})

type ContributionFormData = z.infer<typeof contributionSchema>

interface ContributionFormDialogProps {
  goal: SavingsGoal | null
  onOpenChange: (open: boolean) => void
}

const emptyValues = {
  member_id: undefined as unknown as number,
  account_id: undefined as unknown as number,
  amount: "",
  contribution_date: "",
  description: "",
}

export function ContributionFormDialog({
  goal,
  onOpenChange,
}: ContributionFormDialogProps) {
  const members = useMembers()
  const accounts = useAccounts()
  const createContribution = useCreateSavingsContribution()

  const activeMembers = (members.data ?? []).filter((member) => member.is_active)
  const accountList = accounts.data ?? []
  const open = goal !== null

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (goal) {
      reset({
        ...emptyValues,
        contribution_date: todayISO(),
      })
      clearErrors()
    }
  }, [goal, reset, clearErrors])

  const handleClose = () => {
    reset(emptyValues)
    clearErrors()
    onOpenChange(false)
  }

  const onSubmit = async (values: ContributionFormData) => {
    if (!goal) return
    clearErrors("root")

    const body: SavingsContributionCreate = {
      member_id: values.member_id,
      account_id: values.account_id,
      goal_id: goal.goal_id,
      amount: values.amount,
      contribution_date: values.contribution_date,
      description: values.description?.trim() ? values.description.trim() : null,
    }

    try {
      await createContribution.mutateAsync(body)
      handleClose()
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in values) {
            setError(field as keyof ContributionFormData, { message })
          }
        }
      }
      setError("root", {
        message: error instanceof ApiError ? error.message : getErrorMessage(error),
      })
    }
  }

  const isPending = isSubmitting || createContribution.isPending

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleClose())}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 gap-5">
        <DialogHeader>
          <DialogTitle>Add contribution</DialogTitle>
          <DialogDescription>
            {goal
              ? `Saving toward ${goal.goal_name}. This debits the selected account.`
              : "Record a contribution toward a goal."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {errors.root?.message && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="savings-contribution-member">Member</Label>
              <Controller
                control={control}
                name="member_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <SelectTrigger
                      id="savings-contribution-member"
                      className="w-full"
                      aria-invalid={Boolean(errors.member_id)}
                    >
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
              <Label htmlFor="savings-contribution-account">Account</Label>
              <Controller
                control={control}
                name="account_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <SelectTrigger
                      id="savings-contribution-account"
                      className="w-full"
                      aria-invalid={Boolean(errors.account_id)}
                    >
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountList.map((account) => {
                        const hasTypeInName = account.account_name
                          .toLowerCase()
                          .includes(account.account_type.toLowerCase())
                        const label = hasTypeInName
                          ? account.account_name
                          : `${account.account_name} (${account.account_type})`

                        return (
                          <SelectItem
                            key={account.account_id}
                            value={String(account.account_id)}
                          >
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
              <Label htmlFor="savings-contribution-amount">Amount (PKR)</Label>
              <Input
                id="savings-contribution-amount"
                type="text"
                inputMode="decimal"
                {...register("amount")}
                aria-invalid={Boolean(errors.amount)}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="savings-contribution-date">Contribution date</Label>
              <Input
                id="savings-contribution-date"
                type="date"
                {...register("contribution_date")}
                aria-invalid={Boolean(errors.contribution_date)}
              />
              {errors.contribution_date && (
                <p className="text-xs text-destructive">{errors.contribution_date.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="savings-contribution-goal">Goal</Label>
              <Input
                id="savings-contribution-goal"
                type="text"
                value={goal?.goal_name ?? ""}
                disabled
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="savings-contribution-description">Description</Label>
              <Input
                id="savings-contribution-description"
                type="text"
                placeholder="Optional notes"
                {...register("description")}
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" data-icon="inline-start" />}
              {isPending ? "Adding…" : "Add contribution"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
