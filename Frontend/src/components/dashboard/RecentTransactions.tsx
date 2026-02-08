import { useEffect, useMemo, useState } from 'react'
import { fetchQuery, useRelayEnvironment } from 'react-relay'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/currency'
import { RecentTransactionsQuery } from '@/graphql/RecentTransactionsQuery'
import type {
  RecentTransactionsQuery as RecentTransactionsQueryType,
  RecentTransactionsQuery$data,
} from '@/graphql/__generated__/RecentTransactionsQuery.graphql'

interface RecentTransactionsProps {
  accountIds: string[]
  refreshKey: number
}

type TransactionType = 'SENT' | 'RECEIVED' | 'TRANSFER'

interface RecentTransactionRow {
  id: string
  amount: string
  currency: string
  description: string
  createdAt: string
  type: TransactionType
}

interface AggregatedTransaction {
  id: string
  amount: string
  currency: string
  description: string
  createdAt: string
  directions: Set<'SENT' | 'RECEIVED'>
}

function upsertTransaction(
  map: Map<string, AggregatedTransaction>,
  node: RecentTransactionsQuery$data['sent']['edges'][number]['node'],
  direction: 'SENT' | 'RECEIVED',
) {
  const existing = map.get(node.id)
  if (existing) {
    existing.directions.add(direction)
    return
  }
  map.set(node.id, {
    id: node.id,
    amount: String(node.amount),
    currency: node.currency,
    description: node.description,
    createdAt: String(node.createdAt),
    directions: new Set([direction]),
  })
}

function resolveType(directions: Set<'SENT' | 'RECEIVED'>): TransactionType {
  if (directions.has('SENT') && directions.has('RECEIVED')) {
    return 'TRANSFER'
  }
  return directions.has('RECEIVED') ? 'RECEIVED' : 'SENT'
}

export function RecentTransactions({ accountIds, refreshKey }: RecentTransactionsProps) {
  const environment = useRelayEnvironment()
  const [transactions, setTransactions] = useState<RecentTransactionRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const accountIdsKey = useMemo(
    () => [...new Set(accountIds)].sort().join(','),
    [accountIds],
  )

  useEffect(() => {
    const uniqueAccountIds = accountIdsKey.length === 0 ? [] : accountIdsKey.split(',')
    if (uniqueAccountIds.length === 0) {
      setTransactions([])
      setHasError(false)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setHasError(false)

    Promise.all(
      uniqueAccountIds.map((accountId) =>
        fetchQuery<RecentTransactionsQueryType>(
          environment,
          RecentTransactionsQuery,
          { accountId },
        ).toPromise(),
      ),
    )
      .then((results) => {
        if (cancelled) return
        const map = new Map<string, AggregatedTransaction>()

        results.forEach((result) => {
          if (!result) return
          result.sent.edges.forEach((edge) => upsertTransaction(map, edge.node, 'SENT'))
          result.received.edges.forEach((edge) => upsertTransaction(map, edge.node, 'RECEIVED'))
        })

        const merged = Array.from(map.values())
          .map<RecentTransactionRow>((item) => ({
            id: item.id,
            amount: item.amount,
            currency: item.currency,
            description: item.description,
            createdAt: item.createdAt,
            type: resolveType(item.directions),
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)

        setTransactions(merged)
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true)
          setTransactions([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [environment, accountIdsKey, refreshKey])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <RecentTransactionsSkeleton />}
        {!isLoading && hasError && (
          <p className="py-4 text-center text-sm text-destructive">
            Could not load recent transactions.
          </p>
        )}
        {!isLoading && !hasError && transactions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No transactions yet
          </p>
        ) : null}
        {!isLoading && !hasError && transactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Date</TableHead>
                <TableHead className="text-center">Description</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-center">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {tx.description || 'Transfer'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        tx.type === 'RECEIVED'
                          ? 'default'
                          : tx.type === 'SENT'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {tx.type === 'RECEIVED'
                        ? 'Received'
                        : tx.type === 'SENT'
                          ? 'Sent'
                          : 'Transfer'}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-center text-sm font-medium ${
                    tx.type === 'RECEIVED'
                      ? 'text-green-600'
                      : tx.type === 'SENT'
                        ? 'text-red-600'
                        : 'text-muted-foreground'
                  }`}>
                    {tx.type === 'RECEIVED'
                      ? '+'
                      : tx.type === 'SENT'
                        ? '-'
                        : ''}
                    {formatCurrency(tx.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RecentTransactionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
