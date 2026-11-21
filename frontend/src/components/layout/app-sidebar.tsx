"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, CreditCard, FileText, Goal, LayoutDashboard, Receipt, Settings, WalletCards } from "lucide-react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

const navigation = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Income", href: "/income", icon: WalletCards },
  { label: "Bills", href: "/bills", icon: FileText },
  { label: "Savings", href: "/savings", icon: Goal },
  { label: "Budgets", href: "/budgets", icon: CreditCard },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/" className="flex flex-col gap-0.5"><span className="text-base font-semibold">Family Finance</span><span className="text-xs text-sidebar-foreground/70">Household overview</span></Link>
      </SidebarHeader>
      <SidebarContent><SidebarGroup><SidebarGroupLabel>Navigation</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>
        {navigation.map(({ label, href, icon: Icon }) => <SidebarMenuItem key={href}><SidebarMenuButton isActive={pathname === href} tooltip={label} render={<Link href={href} />}><Icon data-icon="inline-start" /><span>{label}</span></SidebarMenuButton></SidebarMenuItem>)}
      </SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4"><p className="text-xs text-sidebar-foreground/60">Database Systems project</p></SidebarFooter>
    </Sidebar>
  )
}
