import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/currency'

interface BalanceCardProps {
  totalBalance: number
  ownerName: string
  accountCount: number
}

export function BalanceCard({ totalBalance, ownerName, accountCount }: BalanceCardProps) {
  return (
    <Card className="bg-primary text-primary-foreground">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-80">Total Balance</p>
            <p className="mt-1 text-3xl font-bold">{formatCurrency(totalBalance)}</p>
            <p className="mt-2 text-sm opacity-80">
              {accountCount} active account{accountCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">CrudBank</p>
            <p className="mt-1 text-sm opacity-80">{ownerName}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
