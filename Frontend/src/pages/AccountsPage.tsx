import { Suspense, useCallback, useMemo, useState } from 'react'
import { useLazyLoadQuery, fetchQuery, useRelayEnvironment } from 'react-relay'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountsTable } from '@/components/accounts/AccountsTable'
import { CreateAccountDialog } from '@/components/accounts/CreateAccountDialog'
import { AccountsQuery } from '@/graphql/AccountsQuery'
import type {
  AccountsQuery as AccountsQueryType,
  AccountsQuery$data,
} from '@/graphql/__generated__/AccountsQuery.graphql'

type AccountEdge = AccountsQuery$data['accounts']['edges'][number]

function AccountsTableSection({
  refreshKey,
  onRefresh,
}: {
  refreshKey: number
  onRefresh: () => void
}) {
  const [extraEdges, setExtraEdges] = useState<AccountEdge[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const environment = useRelayEnvironment()

  const data = useLazyLoadQuery<AccountsQueryType>(
    AccountsQuery,
    { first: 20 },
    { fetchPolicy: 'store-and-network', fetchKey: refreshKey },
  )

  const initialEdges = useMemo(
    () => data.accounts.edges as unknown as AccountEdge[],
    [data.accounts.edges],
  )

  const effectiveCursor = cursor ?? data.accounts.pageInfo.endCursor ?? null
  const effectiveHasNext = cursor == null
    ? data.accounts.pageInfo.hasNextPage
    : hasNext

  const accounts = useMemo(
    () => [...initialEdges, ...extraEdges].map((edge) => ({
      ...edge.node,
      currentBalance: String(edge.node.currentBalance),
      createdAt: String(edge.node.createdAt),
      updatedAt: String(edge.node.updatedAt),
    })),
    [initialEdges, extraEdges],
  )

  const loadMore = useCallback(() => {
    if (!effectiveCursor || isLoadingMore) {
      return
    }
    setIsLoadingMore(true)

    fetchQuery<AccountsQueryType>(environment, AccountsQuery, {
      first: 20,
      after: effectiveCursor,
    }).subscribe({
      next(nextData) {
        setExtraEdges((prev) => [
          ...prev,
          ...(nextData.accounts.edges as unknown as AccountEdge[]),
        ])
        setHasNext(nextData.accounts.pageInfo.hasNextPage)
        setCursor(nextData.accounts.pageInfo.endCursor ?? null)
        setIsLoadingMore(false)
      },
      error() {
        setIsLoadingMore(false)
      },
    })
  }, [effectiveCursor, isLoadingMore, environment])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">All Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <AccountsTable
          accounts={accounts}
          hasNextPage={effectiveHasNext}
          onLoadMore={loadMore}
          isLoadingMore={isLoadingMore}
          onRefresh={onRefresh}
        />
      </CardContent>
    </Card>
  )
}

function AccountsContent() {
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Accounts</h2>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-2 size-4" />
          New Account
        </Button>
      </div>

      <AccountsTableSection key={refreshKey} refreshKey={refreshKey} onRefresh={refresh} />

      <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={refresh} />
    </div>
  )
}

function AccountsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export function AccountsPage() {
  return (
    <Suspense fallback={<AccountsSkeleton />}>
      <AccountsContent />
    </Suspense>
  )
}
