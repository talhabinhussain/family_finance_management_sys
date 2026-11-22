import type { ReactNode } from "react"

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-[13px] leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </header>
  )
}
