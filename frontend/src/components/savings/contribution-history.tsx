"use client"

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
import { formatDate } from "@/lib/formatters"
import { useAccounts } from "@/hooks/use-accounts"
import { useMembers } from "@/hooks/use-members"
import { useSavingsGoals } from "@/hooks/use-savings-goals"
import { useSavingsContributions } from "@/hooks/use-savings-contributions"

export function ContributionHistory() {
  const contributionsQuery = useSavingsContributions()
  const goals = useSavingsGoals()
  const members = useMembers()
  const accounts = useAccounts()

  return (
    <section className="flex flex-col gap-4" aria-labelledby="contribution-history-heading">
      <h2 id="contribution-history-heading" className="text-lg font-medium">
        Contribution history
      </h2>
      <DataState
        query={contributionsQuery}
        loading={<LoadingState rows={4} />}
        empty={
          <EmptyState
            title="No contributions yet"
            description="Contributions you record toward a goal appear here."
          />
        }
      >
        {(contributions) => (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Goal</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((row) => (
                  <TableRow key={row.contribution_id}>
                    <TableCell>{formatDate(row.contribution_date)}</TableCell>
                    <TableCell>{goals.byId.get(row.goal_id)?.goal_name ?? "—"}</TableCell>
                    <TableCell>{members.byId.get(row.member_id)?.full_name ?? "—"}</TableCell>
                    <TableCell>{accounts.byId.get(row.account_id)?.account_name ?? "—"}</TableCell>
                    <TableCell>
                      {row.description ? (
                        <span className="block max-w-xs truncate">{row.description}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Money value={row.amount} className="font-medium" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DataState>
    </section>
  )
}
