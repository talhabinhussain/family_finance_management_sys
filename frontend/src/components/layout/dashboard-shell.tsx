"use client"

import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex min-h-[calc(100svh-3.5rem)] flex-1 flex-col bg-muted/30">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
