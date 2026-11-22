"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api"

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = getErrorMessage(error)
  return (
    <Alert variant="destructive">
      <AlertTitle>Unable to load data</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>{message}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action}
    </Empty>
  )
}

type DataStateProps<T> = {
  query: Pick<UseQueryResult<T>, "data" | "error" | "isPending" | "refetch">
  empty: React.ReactNode
  isEmpty?: (data: T) => boolean
  loading?: React.ReactNode
  children: (data: T) => React.ReactNode
}

export function DataState<T>({
  query,
  empty,
  isEmpty,
  loading,
  children,
}: DataStateProps<T>) {
  if (query.isPending) {
    return loading ?? <LoadingState />
  }

  if (query.data === undefined && query.error) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  }

  if (query.data !== undefined) {
    const isDataEmpty = isEmpty
      ? isEmpty(query.data)
      : Array.isArray(query.data) && query.data.length === 0

    if (isDataEmpty) {
      return empty
    }

    return children(query.data)
  }

  return null
}
