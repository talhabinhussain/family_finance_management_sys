import type { UseQueryResult } from "@tanstack/react-query"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card"
import { DataState, EmptyState, LoadingState } from "@/components/shared/data-state"

export type DataCardProps<T> = {
  title: string
  description?: string
  action?: React.ReactNode
  query: Pick<UseQueryResult<T>, "data" | "error" | "isPending" | "refetch">
  emptyTitle: string
  emptyDescription: string
  isEmpty?: (data: T) => boolean
  loadingRows?: number
  className?: string
  children: (data: T) => React.ReactNode
}

export function DataCard<T>({
  title,
  description,
  action,
  query,
  emptyTitle,
  emptyDescription,
  isEmpty,
  loadingRows = 4,
  className,
  children,
}: DataCardProps<T>) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>
        <DataState
          query={query}
          loading={<LoadingState rows={loadingRows} />}
          empty={<EmptyState title={emptyTitle} description={emptyDescription} />}
          isEmpty={isEmpty}
        >
          {(data) => children(data)}
        </DataState>
      </CardContent>
    </Card>
  )
}
