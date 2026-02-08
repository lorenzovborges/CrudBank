import { Component, type ReactNode, useMemo } from 'react'
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
import { formatCurrency } from '@/lib/currency'
import { RecentTransactionsQuery } from '@/graphql/RecentTransactionsQuery'
import type { RecentTransactionsQuery as RecentTransactionsQueryType } from '@/graphql/__generated__/RecentTransactionsQuery.graphql'

interface RecentTransactionsProps {
  accountIds: string[]
  refreshKey: number
}

type TransactionType = 'SENT' | 'RECEIVED' | 'TRANSFER'

interface RecentTransactionRow {
  id: string
  amount: string
  description: string
  createdAt: string
  type: TransactionType
}

interface RecentTransactionsErrorBoundaryProps {
  resetKey: string
  children: ReactNode
}

interface RecentTransactionsErrorBoundaryState {
  hasError: boolean
}

class RecentTransactionsErrorBoundary extends Component<
  RecentTransactionsErrorBoundaryProps,
  RecentTransactionsErrorBoundaryState
> {
  state: RecentTransactionsErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): RecentTransactionsErrorBoundaryState {
    return { hasError: true }
  }

  componentDidUpdate(prevProps: Readonly<RecentTransactionsErrorBoundaryProps>) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return <RecentTransactionsCard transactions={[]} hasError />
    }
    return this.props.children
  }
}

function transactionTypeLabel(type: TransactionType): string {
  if (type === 'RECEIVED') {
    return 'Received'
  }
  if (type === 'SENT') {
    return 'Sent'
  }
  return 'Transfer'
}

export function RecentTransactions({ accountIds, refreshKey }: RecentTransactionsProps) {
  const uniqueAccountIds = useMemo(
    () => [...new Set(accountIds)].filter((id) => id.trim().length > 0),
    [accountIds],
  )
  if (uniqueAccountIds.length === 0) {
    return <RecentTransactionsCard transactions={[]} />
  }

  const accountIdsKey = uniqueAccountIds.join(',')
  const fetchKey = `${refreshKey}-${accountIdsKey}`
  return (
    <RecentTransactionsErrorBoundary resetKey={fetchKey}>
      <RecentTransactionsQueryContent
        accountIds={uniqueAccountIds}
        fetchKey={fetchKey}
      />
    </RecentTransactionsErrorBoundary>
  )
}

function RecentTransactionsQueryContent({
  accountIds,
  fetchKey,
}: {
  accountIds: string[]
  fetchKey: string
}) {

  const data = useLazyLoadQuery<RecentTransactionsQueryType>(
    RecentTransactionsQuery,
    {
      accountIds,
      first: 10,
    },
    {
      fetchPolicy: 'store-and-network',
      fetchKey,
    },
  )

  const transactions = useMemo<RecentTransactionRow[]>(
    () =>
      data.recentTransactions.map((item) => ({
        id: item.transaction.id,
        amount: String(item.transaction.amount),
        description: item.transaction.description,
        createdAt: String(item.transaction.createdAt),
        type: item.type as TransactionType,
      })),
    [data],
  )

  return <RecentTransactionsCard transactions={transactions} />
}

function RecentTransactionsCard({
  transactions,
  hasError = false,
}: {
  transactions: RecentTransactionRow[]
  hasError?: boolean
}) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {hasError ? (
          <p className="py-4 text-center text-sm text-destructive">
            Could not load recent transactions.
          </p>
        ) : transactions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No transactions yet
          </p>
        ) : (
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
                      {transactionTypeLabel(tx.type)}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-center text-sm font-medium ${
                      tx.type === 'RECEIVED'
                        ? 'text-green-600'
                        : tx.type === 'SENT'
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {tx.type === 'RECEIVED' ? '+' : tx.type === 'SENT' ? '-' : ''}
                    {formatCurrency(tx.amount)}
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
