"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataCard } from "@/components/shared/data-card"
import { Money } from "@/components/shared/money"
import { useAccounts } from "@/hooks/use-accounts"
import type { Account } from "@/types"

export function AccountsCard() {
  const query = useAccounts()

  const action = (
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/reports" />}>
      Reconciliation report
    </Button>
  )

  return (
    <DataCard
      title="Accounts"
      description="Current balance of each account. Not affected by the month."
      action={action}
      query={query}
      emptyTitle="No accounts yet"
      emptyDescription="Add accounts in Settings to see balances."
      isEmpty={(accounts) => accounts.length === 0}
      loadingRows={4}
    >
      {(accounts) => (
        <div className="flex flex-col justify-between gap-4">
          <div className="flex flex-col divide-y divide-border">
            {accounts.map((account: Account) => (
              <div
                key={account.account_id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-foreground truncate">
                    {account.account_name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {account.account_type}
                  </Badge>
                </div>

                <div className="tabular-nums font-medium text-foreground shrink-0">
                  <Money value={account.balance} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t border-border pt-3">
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/reports" />}>
              Reconciliation report
            </Button>
          </div>
        </div>
      )}
    </DataCard>
  )
}
