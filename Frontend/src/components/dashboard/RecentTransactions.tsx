import { Suspense } from 'react'
import { useLazyLoadQuery } from 'react-relay'
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
import type { RecentTransactionsQuery as RecentTransactionsQueryType } from '@/graphql/__generated__/RecentTransactionsQuery.graphql'

interface RecentTransactionsProps {
  accountId: string
}

function RecentTransactionsContent({ accountId }: RecentTransactionsProps) {
  const data = useLazyLoadQuery<RecentTransactionsQueryType>(
    RecentTransactionsQuery,
    { accountId },
    { fetchPolicy: 'store-and-network' }
  )

  const sent = data.sent.edges.map((e) => ({
    ...e.node,
    type: 'SENT' as const,
  }))
  const received = data.received.edges.map((e) => ({
    ...e.node,
    type: 'RECEIVED' as const,
  }))

  const transactions = [...sent, ...received]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No transactions yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {tx.description || 'Transfer'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tx.type === 'RECEIVED' ? 'default' : 'destructive'}>
                      {tx.type === 'RECEIVED' ? 'Received' : 'Sent'}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right text-sm font-medium ${
                    tx.type === 'RECEIVED' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'RECEIVED' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function RecentTransactionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

export function RecentTransactions({ accountId }: RecentTransactionsProps) {
  return (
    <Suspense fallback={<RecentTransactionsSkeleton />}>
      <RecentTransactionsContent accountId={accountId} />
    </Suspense>
  )
}
