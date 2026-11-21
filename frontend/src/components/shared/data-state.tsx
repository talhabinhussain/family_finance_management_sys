"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api"

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return <div className="flex flex-col gap-3" aria-label="Loading"><Skeleton className="h-8 w-full" />{Array.from({ length: rows }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : "Something went wrong."
  return <Alert variant="destructive"><AlertTitle>Unable to load data</AlertTitle><AlertDescription className="flex items-center justify-between gap-4"><span>{message}</span><Button variant="outline" size="sm" onClick={onRetry}>Retry</Button></AlertDescription></Alert>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <Empty><EmptyHeader><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>{action}</Empty>
}
