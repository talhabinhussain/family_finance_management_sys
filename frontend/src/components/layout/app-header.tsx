import { SidebarTrigger } from "@/components/ui/sidebar"

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4 md:px-6">
      <SidebarTrigger aria-label="Toggle navigation" />
      <div className="h-5 w-px bg-border" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Family Finance Management System</p>
    </header>
  )
}
