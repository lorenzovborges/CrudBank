import { isValidBrazilDocument, normalizeDocument } from '@/lib/validation/document'

export interface AccountFormValues {
  ownerName: string
  document: string
  branch: string
  number: string
  initialBalance?: string
}

export interface AccountValidationResult {
  values: AccountFormValues
  errors: Record<string, string>
}

const ACCOUNT_NUMBER_REGEX = /^\d{5,12}(-\d{1})?$/
const MONEY_REGEX = /^\d+(\.\d{1,2})?$/

function normalizeOwnerName(ownerName: string): string {
  return ownerName.trim().replace(/\s+/g, ' ')
}

export function validateAccountForm(values: AccountFormValues): AccountValidationResult {
  const ownerName = normalizeOwnerName(values.ownerName)
  const document = normalizeDocument(values.document)
  const branch = values.branch.replace(/\D/g, '')
  const number = values.number.trim().replace(/\s+/g, '')
  const initialBalance = values.initialBalance?.trim() ?? ''

  const errors: Record<string, string> = {}

  if (ownerName.length < 3 || ownerName.length > 120) {
    errors.ownerName = 'Owner name must be between 3 and 120 characters.'
  }

  if (!isValidBrazilDocument(values.document)) {
    errors.document = 'Document must be a valid CPF or CNPJ.'
  }

  if (!/^\d{4}$/.test(branch)) {
    errors.branch = 'Branch must contain exactly 4 digits.'
  }

  if (!ACCOUNT_NUMBER_REGEX.test(number)) {
    errors.number = 'Account number must match 12345 or 12345-6 pattern.'
  }

  if (initialBalance.length > 0) {
    if (!MONEY_REGEX.test(initialBalance)) {
      errors.initialBalance = 'Initial balance must have at most 2 decimal places.'
    } else if (Number(initialBalance) < 0) {
      errors.initialBalance = 'Initial balance must be zero or greater.'
    }
  }

  return {
    values: {
      ownerName,
      document,
      branch,
      number,
      initialBalance,
    },
    errors,
  }
}
