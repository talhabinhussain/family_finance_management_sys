import { DashboardShell } from "@/components/layout/dashboard-shell"
import { EmptyState } from "@/components/shared/data-state"
import { PageHeader } from "@/components/shared/page-header"

export default function Home() {
  return (
    <DashboardShell>
      <PageHeader title="Dashboard" description="Your household finance overview will appear here." />
      <EmptyState title="Dashboard coming next" description="The dashboard data views will be implemented from the dashboard slice specification." />
    </DashboardShell>
  )
}
