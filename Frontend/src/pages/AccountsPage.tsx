import { Suspense, useState, useCallback, useEffect } from 'react'
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

function AccountsContent() {
  const [createOpen, setCreateOpen] = useState(false)
  const [allEdges, setAllEdges] = useState<AccountEdge[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const environment = useRelayEnvironment()

  const data = useLazyLoadQuery<AccountsQueryType>(
    AccountsQuery,
    { first: 20 },
    { fetchPolicy: 'store-and-network', fetchKey: refreshKey }
  )

  useEffect(() => {
    setAllEdges(data.accounts.edges as unknown as AccountEdge[])
    setHasNext(data.accounts.pageInfo.hasNextPage)
    setCursor(data.accounts.pageInfo.endCursor ?? null)
  }, [data])

  const loadMore = useCallback(() => {
    if (!cursor || isLoadingMore) return
    setIsLoadingMore(true)

    fetchQuery<AccountsQueryType>(environment, AccountsQuery, {
      first: 20,
      after: cursor,
    }).subscribe({
      next(nextData) {
        setAllEdges((prev) => [...prev, ...(nextData.accounts.edges as unknown as AccountEdge[])])
        setHasNext(nextData.accounts.pageInfo.hasNextPage)
        setCursor(nextData.accounts.pageInfo.endCursor ?? null)
        setIsLoadingMore(false)
      },
      error() {
        setIsLoadingMore(false)
      },
    })
  }, [cursor, isLoadingMore, environment])

  const accounts = allEdges.map((e) => ({
    ...e.node,
    currentBalance: String(e.node.currentBalance),
    createdAt: String(e.node.createdAt),
    updatedAt: String(e.node.updatedAt),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Accounts</h2>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-2 size-4" />
          New Account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountsTable
            accounts={accounts}
            hasNextPage={hasNext}
            onLoadMore={loadMore}
            isLoadingMore={isLoadingMore}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </CardContent>
      </Card>

      <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => setRefreshKey((k) => k + 1)} />
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
