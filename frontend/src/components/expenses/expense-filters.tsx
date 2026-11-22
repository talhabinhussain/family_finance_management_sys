"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCategories } from "@/hooks/use-categories"
import { useMembers } from "@/hooks/use-members"
import type { ExpenseFilters as Filters } from "@/hooks/use-expenses"

interface ExpenseFiltersProps {
  filters: Filters
  onFilterChange: (filters: Filters) => void
  onClear: () => void
}

export function ExpenseFilters({ filters, onFilterChange, onClear }: ExpenseFiltersProps) {
  const membersQuery = useMembers()
  const categoriesQuery = useCategories()

  const activeMembers = (membersQuery.data ?? []).filter((m) => m.is_active)
  const expenseCategories = categoriesQuery.expenseCategories

  const hasFilters = Boolean(
    filters.member_id !== undefined ||
    filters.category_id !== undefined ||
    filters.from !== undefined ||
    filters.to !== undefined
  )

  return (
    <div className="flex flex-wrap items-end gap-3 text-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="member-filter">Member</Label>
        <Select
          value={filters.member_id !== undefined ? String(filters.member_id) : "all"}
          onValueChange={(val) =>
            onFilterChange({
              ...filters,
              member_id: val === "all" || val === null ? undefined : Number(val),
            })
          }
        >
          <SelectTrigger id="member-filter" className="w-[180px]">
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {activeMembers.map((member) => (
              <SelectItem key={member.member_id} value={String(member.member_id)}>
                {member.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-filter">Category</Label>
        <Select
          value={filters.category_id !== undefined ? String(filters.category_id) : "all"}
          onValueChange={(val) =>
            onFilterChange({
              ...filters,
              category_id: val === "all" || val === null ? undefined : Number(val),
            })
          }
        >
          <SelectTrigger id="category-filter" className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {expenseCategories.map((category) => (
              <SelectItem key={category.category_id} value={String(category.category_id)}>
                {category.category_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from-date-filter">From</Label>
        <Input
          id="from-date-filter"
          type="date"
          className="w-[160px]"
          value={filters.from ?? ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              from: e.target.value ? e.target.value : undefined,
            })
          }
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to-date-filter">To</Label>
        <Input
          id="to-date-filter"
          type="date"
          className="w-[160px]"
          value={filters.to ?? ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              to: e.target.value ? e.target.value : undefined,
            })
          }
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="self-end mb-0.5">
          Clear filters
        </Button>
      )}
    </div>
  )
}
