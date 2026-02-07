export interface GraphqlViolation {
  field: string
  message: string
}

export interface ParsedGraphqlError {
  code?: string
  message: string
  userMessage: string
  violations: GraphqlViolation[]
}

type GraphqlErrorLike = {
  message?: string
  extensions?: {
    code?: string
    violations?: unknown
  }
}

const FRIENDLY_MESSAGE_BY_CODE: Record<string, string> = {
  INSUFFICIENT_FUNDS: 'Insufficient funds in the source account.',
  ACCOUNT_INACTIVE: 'This account is inactive for this operation.',
  VALIDATION_ERROR: 'Please review the highlighted fields.',
  CONFLICT: 'Operation conflict. Please review your input and try again.',
  RATE_LIMITED: 'Too many requests. Please try again shortly.',
}

const DEFAULT_FALLBACK = 'We could not complete your request.'

function normalizeViolation(value: unknown): GraphqlViolation | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const violation = value as Record<string, unknown>
  const field = typeof violation.field === 'string' && violation.field.trim().length > 0
    ? violation.field.trim()
    : null
  const message = typeof violation.message === 'string' && violation.message.trim().length > 0
    ? violation.message.trim()
    : null

  if (!field || !message) {
    return null
  }

  return { field, message }
}

function readGraphqlErrors(error: unknown): GraphqlErrorLike[] {
  const maybeError = error as Record<string, unknown> | null
  if (!maybeError) {
    return []
  }

  const sources = [
    maybeError.source,
    (maybeError.cause as Record<string, unknown> | undefined)?.source,
    maybeError.response,
  ]

  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue
    }

    const errors = (source as { errors?: unknown }).errors
    if (Array.isArray(errors)) {
      return errors as GraphqlErrorLike[]
    }
  }

  return []
}

export function parseGraphqlError(error: unknown): ParsedGraphqlError {
  const graphqlErrors = readGraphqlErrors(error)
  const first = graphqlErrors[0]
  const code = first?.extensions?.code

  const rawViolations = first?.extensions?.violations
  const violations = Array.isArray(rawViolations)
    ? rawViolations.map(normalizeViolation).filter((v): v is GraphqlViolation => v !== null)
    : []

  const rawMessage =
    typeof first?.message === 'string' && first.message.trim().length > 0
      ? first.message.trim()
      : error instanceof Error && error.message.trim().length > 0
        ? error.message.trim()
        : DEFAULT_FALLBACK

  const userMessage = code && FRIENDLY_MESSAGE_BY_CODE[code]
    ? FRIENDLY_MESSAGE_BY_CODE[code]
    : DEFAULT_FALLBACK

  return {
    code,
    message: rawMessage,
    userMessage,
    violations,
  }
}

export function violationsToFieldErrors(
  violations: GraphqlViolation[],
): Record<string, string> {
  return violations.reduce<Record<string, string>>((acc, violation) => {
    if (!acc[violation.field]) {
      acc[violation.field] = violation.message
    }
    return acc
  }, {})
}
