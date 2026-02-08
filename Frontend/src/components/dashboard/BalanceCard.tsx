import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/currency'

interface BalanceCardProps {
  totalBalance: number
  accountCount: number
}

export function BalanceCard({ totalBalance, accountCount }: BalanceCardProps) {
  return (
    <Card className="bg-primary text-primary-foreground">
      <CardContent className="p-5">
        <p className="text-sm opacity-80">Total Balance</p>
        <p className="mt-1 text-2xl font-bold">{formatCurrency(totalBalance)}</p>
        <p className="mt-2 text-sm opacity-80">
          {accountCount} active account{accountCount !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  )
}
