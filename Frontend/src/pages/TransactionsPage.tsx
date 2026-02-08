import { Suspense, useCallback, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { fetchQuery, useLazyLoadQuery, useRelayEnvironment } from 'react-relay'
import { TransactionsTable } from '@/components/transactions/TransactionsTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountsQuery } from '@/graphql/AccountsQuery'
import { TransactionsByAccountQuery } from '@/graphql/TransactionsByAccountQuery'
import type { AccountsQuery as AccountsQueryType } from '@/graphql/__generated__/AccountsQuery.graphql'
import type {
  TransactionsByAccountQuery as TransactionsByAccountQueryType,
  TransactionsByAccountQuery$data,
} from '@/graphql/__generated__/TransactionsByAccountQuery.graphql'

type TransactionEdge = TransactionsByAccountQuery$data['transactionsByAccount']['edges'][number]

function TransactionsList({
  accountId,
  direction,
  accountLabelMap,
}: {
  accountId: string
  direction: 'SENT' | 'RECEIVED'
  accountLabelMap: Map<string, string>
}) {
  const environment = useRelayEnvironment()
  const [extraEdges, setExtraEdges] = useState<TransactionEdge[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const data = useLazyLoadQuery<TransactionsByAccountQueryType>(
    TransactionsByAccountQuery,
    { accountId, direction, first: 20 },
    { fetchPolicy: 'store-and-network', fetchKey: `${accountId}-${direction}` },
  )

  const initialEdges = useMemo(
    () => data.transactionsByAccount.edges as unknown as TransactionEdge[],
    [data.transactionsByAccount.edges],
  )

  const effectiveCursor = cursor ?? data.transactionsByAccount.pageInfo.endCursor ?? null
  const effectiveHasNext = cursor == null
    ? data.transactionsByAccount.pageInfo.hasNextPage
    : hasNext

  const loadMore = useCallback(() => {
    if (!effectiveCursor || isLoadingMore) {
      return
    }
    setIsLoadingMore(true)

    fetchQuery<TransactionsByAccountQueryType>(
      environment,
      TransactionsByAccountQuery,
      { accountId, direction, first: 20, after: effectiveCursor },
    ).subscribe({
      next(nextData) {
        setExtraEdges((prev) => [
          ...prev,
          ...(nextData.transactionsByAccount.edges as unknown as TransactionEdge[]),
        ])
        setHasNext(nextData.transactionsByAccount.pageInfo.hasNextPage)
        setCursor(nextData.transactionsByAccount.pageInfo.endCursor ?? null)
        setIsLoadingMore(false)
      },
      error() {
        setIsLoadingMore(false)
      },
    })
  }, [effectiveCursor, isLoadingMore, environment, accountId, direction])

  const transactions = useMemo(
    () => [...initialEdges, ...extraEdges].map((edge) => {
      const counterpartyId =
        direction === 'SENT' ? edge.node.toAccountId : edge.node.fromAccountId

      return {
        id: edge.node.id,
        amount: String(edge.node.amount),
        currency: edge.node.currency,
        description: edge.node.description,
        createdAt: String(edge.node.createdAt),
        counterpartyLabel: accountLabelMap.get(counterpartyId) ?? 'Unknown account',
      }
    }),
    [initialEdges, extraEdges, direction, accountLabelMap],
  )

  return (
    <TransactionsTable
      transactions={transactions}
      direction={direction}
      hasNextPage={effectiveHasNext}
      onLoadMore={loadMore}
      isLoadingMore={isLoadingMore}
    />
  )
}

function TransactionsContent() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const preselectedAccountId = searchParams.get('accountId') || ''
  const [manualSelectedAccountId, setManualSelectedAccountId] = useState('')
  const [direction, setDirection] = useState<'SENT' | 'RECEIVED'>('SENT')

  const accountsData = useLazyLoadQuery<AccountsQueryType>(
    AccountsQuery,
    { first: 100 },
    {
      fetchPolicy: 'store-and-network',
      fetchKey: `accounts-${location.key}`,
    },
  )

  const allAccounts = useMemo(
    () => accountsData.accounts.edges.map((edge) => edge.node),
    [accountsData.accounts.edges],
  )

  const selectableAccounts = useMemo(
    () => allAccounts.filter((account) => account.status === 'ACTIVE'),
    [allAccounts],
  )

  const accountLabelMap = useMemo(
    () =>
      new Map(
        allAccounts.map((account) => [
          account.id,
          `${account.ownerName} - ${account.branch}/${account.number}`,
        ]),
      ),
    [allAccounts],
  )

  const selectedAccountId = useMemo(() => {
    if (selectableAccounts.length === 0) {
      return ''
    }

    if (manualSelectedAccountId.length > 0) {
      const selectedIsActive = selectableAccounts.some(
        (account) => account.id === manualSelectedAccountId,
      )
      if (selectedIsActive) {
        return manualSelectedAccountId
      }
    }

    if (preselectedAccountId.length > 0) {
      const preselectedIsActive = selectableAccounts.some(
        (account) => account.id === preselectedAccountId,
      )
      if (preselectedIsActive) {
        return preselectedAccountId
      }
    }

    return selectableAccounts[0].id
  }, [manualSelectedAccountId, preselectedAccountId, selectableAccounts])

  if (!selectedAccountId || selectableAccounts.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No active accounts found. Create an account first.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Transactions</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-72">
          <Select value={selectedAccountId} onValueChange={setManualSelectedAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {selectableAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.ownerName} - {account.branch}/{account.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={direction}
            onValueChange={(value) => setDirection(value as 'SENT' | 'RECEIVED')}
          >
            <TabsList>
              <TabsTrigger value="SENT">Sent</TabsTrigger>
              <TabsTrigger value="RECEIVED">Received</TabsTrigger>
            </TabsList>
            <TabsContent value="SENT" className="mt-4">
              <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                <TransactionsList
                  key={`${selectedAccountId}-SENT`}
                  accountId={selectedAccountId}
                  direction="SENT"
                  accountLabelMap={accountLabelMap}
                />
              </Suspense>
            </TabsContent>
            <TabsContent value="RECEIVED" className="mt-4">
              <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                <TransactionsList
                  key={`${selectedAccountId}-RECEIVED`}
                  accountId={selectedAccountId}
                  direction="RECEIVED"
                  accountLabelMap={accountLabelMap}
                />
              </Suspense>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function TransactionsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsSkeleton />}>
      <TransactionsContent />
    </Suspense>
  )
}
