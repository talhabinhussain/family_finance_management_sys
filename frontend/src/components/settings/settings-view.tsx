"use client"

import { AppearanceCard } from "@/components/settings/appearance-card"
import { PageHeader } from "@/components/shared/page-header"

export function SettingsView() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage how the app looks on this device."
      />
      <AppearanceCard />
    </div>
  )
}
