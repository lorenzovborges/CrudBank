import { Card, CardContent } from '@/components/ui/card'
import { formatCents } from '@/lib/money'

interface BalanceCardProps {
  totalBalanceCents: number
  accountCount: number
}

export function BalanceCard({ totalBalanceCents, accountCount }: BalanceCardProps) {
  return (
    <Card className="bg-primary text-primary-foreground">
      <CardContent className="p-5">
        <p className="text-sm opacity-80">Total Balance</p>
        <p className="mt-1 text-2xl font-bold">{formatCents(totalBalanceCents)}</p>
        <p className="mt-2 text-sm opacity-80">
          {accountCount} active account{accountCount !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  )
}
