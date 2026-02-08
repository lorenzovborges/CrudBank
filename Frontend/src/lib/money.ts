const DECIMAL_WITH_DOT = /^-?\d+(?:\.\d{1,2})?$/
const DECIMAL_WITH_COMMA = /^-?\d+(?:,\d{1,2})?$/

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function normalizeMoneyText(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return null
  }

  if (DECIMAL_WITH_DOT.test(trimmed)) {
    return trimmed
  }

  if (DECIMAL_WITH_COMMA.test(trimmed)) {
    return trimmed.replace(',', '.')
  }

  return null
}

function centsFromNormalizedString(normalized: string): number {
  const [whole, fraction = ''] = normalized.split('.')
  const paddedFraction = (fraction + '00').slice(0, 2)
  const sign = whole.startsWith('-') ? -1 : 1
  const wholePart = whole.replace('-', '')

  const wholeCents = Number(wholePart) * 100
  const fractionCents = Number(paddedFraction)
  return sign * (wholeCents + fractionCents)
}

export function toCents(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Invalid money value')
    }

    const rounded = Math.round(value * 100)
    return rounded
  }

  const normalized = normalizeMoneyText(value)
  if (!normalized) {
    throw new Error('Invalid money value')
  }

  return centsFromNormalizedString(normalized)
}

export function tryToCents(value: string | number): number | null {
  try {
    return toCents(value)
  } catch {
    return null
  }
}

export function sumCents(values: Array<string | number>): number {
  return values.reduce<number>((sum, value) => sum + toCents(value), 0)
}

export function compareCents(left: string | number, right: string | number): number {
  const leftCents = toCents(left)
  const rightCents = toCents(right)
  if (leftCents === rightCents) {
    return 0
  }
  return leftCents > rightCents ? 1 : -1
}

export function formatCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}
