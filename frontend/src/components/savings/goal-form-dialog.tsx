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
import { useMembers } from "@/hooks/use-members"
import { useCreateSavingsGoal } from "@/hooks/use-savings-goals"
import type { SavingsGoalCreate } from "@/types"

const goalFormSchema = z.object({
  goal_name: z
    .string()
    .trim()
    .min(1, "Goal name is required")
    .max(100, "Goal name must be 100 characters or less"),
  target_amount: z
    .string()
    .min(1, "Target amount is required")
    .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a valid amount (up to 10 digits, 2 decimals)")
    .refine((val) => Number(val) > 0, "Target amount must be greater than 0"),
  target_date: z.string().optional(),
  created_by_member_id: z
    .number({ message: "Created by is required" })
    .int()
    .positive("Created by is required"),
})

type GoalFormData = z.infer<typeof goalFormSchema>

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const defaultValues = {
  goal_name: "",
  target_amount: "",
  target_date: "",
  created_by_member_id: undefined as unknown as number,
}

export function GoalFormDialog({ open, onOpenChange }: GoalFormDialogProps) {
  const members = useMembers()
  const createGoal = useCreateSavingsGoal()
  const activeMembers = (members.data ?? []).filter((member) => member.is_active)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues,
  })

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

  const onSubmit = async (values: GoalFormData) => {
    clearErrors("root")

    const body: SavingsGoalCreate = {
      goal_name: values.goal_name.trim(),
      target_amount: values.target_amount,
      target_date: values.target_date?.trim() ? values.target_date.trim() : null,
      created_by_member_id: values.created_by_member_id,
    }

    try {
      await createGoal.mutateAsync(body)
      handleClose()
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in values) {
            setError(field as keyof GoalFormData, { message })
          }
        }
      }
      setError("root", {
        message: error instanceof ApiError ? error.message : getErrorMessage(error),
      })
    }
  }

  const isPending = isSubmitting || createGoal.isPending

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleClose())}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 gap-5">
        <DialogHeader>
          <DialogTitle>Add goal</DialogTitle>
          <DialogDescription>
            Set a target and, optionally, a date to reach it by.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {errors.root?.message && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="savings-goal-form-name">Goal name</Label>
              <Input
                id="savings-goal-form-name"
                {...register("goal_name")}
                aria-invalid={Boolean(errors.goal_name)}
              />
              {errors.goal_name && (
                <p className="text-xs text-destructive">{errors.goal_name.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="savings-goal-form-target-amount">Target amount (PKR)</Label>
              <Input
                id="savings-goal-form-target-amount"
                type="text"
                inputMode="decimal"
                {...register("target_amount")}
                aria-invalid={Boolean(errors.target_amount)}
              />
              {errors.target_amount && (
                <p className="text-xs text-destructive">{errors.target_amount.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="savings-goal-form-target-date">Target date</Label>
              <Input
                id="savings-goal-form-target-date"
                type="date"
                {...register("target_date")}
                aria-invalid={Boolean(errors.target_date)}
              />
              <p className="text-xs text-muted-foreground">Optional.</p>
              {errors.target_date && (
                <p className="text-xs text-destructive">{errors.target_date.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="savings-goal-form-creator">Created by</Label>
              <Controller
                control={control}
                name="created_by_member_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <SelectTrigger
                      id="savings-goal-form-creator"
                      className="w-full"
                      aria-invalid={Boolean(errors.created_by_member_id)}
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
              {errors.created_by_member_id && (
                <p className="text-xs text-destructive">{errors.created_by_member_id.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2Icon className="animate-spin" data-icon="inline-start" />}
              {isPending ? "Adding…" : "Add goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
