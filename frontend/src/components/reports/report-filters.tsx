import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MonthInput } from "@/components/shared/month-input"
import type { MonthRange } from "@/hooks/use-reports"

export type ReportFiltersProps = {
  range: MonthRange
  onChange: (range: MonthRange) => void
}

export function ReportFilters({ range, onChange }: ReportFiltersProps) {
  const isInvalid = Boolean(range.start && range.end && range.start > range.end)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from-month" className="text-xs font-medium text-muted-foreground">
            From month
          </Label>
          <MonthInput
            id="from-month"
            value={range.start}
            onChange={(e) => onChange({ ...range, start: e.target.value })}
            className="w-40"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to-month" className="text-xs font-medium text-muted-foreground">
            To month
          </Label>
          <MonthInput
            id="to-month"
            value={range.end}
            onChange={(e) => onChange({ ...range, end: e.target.value })}
            className="w-40"
          />
        </div>

        <Button
          variant="outline"
          size="default"
          onClick={() => onChange({ start: "", end: "" })}
          disabled={!range.start && !range.end}
        >
          Clear
        </Button>
      </div>

      {isInvalid && (
        <p className="text-xs text-destructive">
          From month must be on or before To month
        </p>
      )}
    </div>
  )
}
