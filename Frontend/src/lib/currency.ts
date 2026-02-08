import { formatCents, tryToCents } from '@/lib/money'

export function formatCurrency(value: string | number): string {
  const cents = tryToCents(value)
  return formatCents(cents ?? 0)
}
