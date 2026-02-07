import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/currency'

interface TransactionNode {
  id: string
  counterpartyLabel: string
  amount: string
  currency: string
  description: string
  createdAt: string
}

interface TransactionsTableProps {
  transactions: TransactionNode[]
  direction: 'SENT' | 'RECEIVED'
  hasNextPage: boolean
  onLoadMore: () => void
  isLoadingMore: boolean
}

export function TransactionsTable({
  transactions,
  direction,
  hasNextPage,
  onLoadMore,
  isLoadingMore,
}: TransactionsTableProps) {
  return (
    <>
      {transactions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No transactions found
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>{direction === 'SENT' ? 'To Account' : 'From Account'}</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(tx.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell className="text-sm">{tx.counterpartyLabel}</TableCell>
                <TableCell>{tx.description || 'Transfer'}</TableCell>
                <TableCell
                  className={`text-right font-medium ${
                    direction === 'RECEIVED' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {direction === 'RECEIVED' ? '+' : '-'}{formatCurrency(tx.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </>
  )
}
