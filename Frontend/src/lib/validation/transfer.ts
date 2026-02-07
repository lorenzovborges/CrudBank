export interface TransferFormValues {
  fromAccountId: string
  toAccountId: string
  amount: string
  description?: string
}

export interface TransferValidationResult {
  values: TransferFormValues
  errors: Record<string, string>
}

const MONEY_REGEX = /^\d+(\.\d{1,2})?$/

export function validateTransferForm(values: TransferFormValues): TransferValidationResult {
  const fromAccountId = values.fromAccountId.trim()
  const toAccountId = values.toAccountId.trim()
  const amount = values.amount.trim()
  const description = values.description?.trim() ?? ''

  const errors: Record<string, string> = {}

  if (!fromAccountId) {
    errors.fromAccountId = 'Please select a source account.'
  }

  if (!toAccountId) {
    errors.toAccountId = 'Please select a destination account.'
  }

  if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
    errors.toAccountId = 'Source and destination accounts must be different.'
  }

  if (!amount) {
    errors.amount = 'Amount is required.'
  } else if (!MONEY_REGEX.test(amount)) {
    errors.amount = 'Amount must have at most 2 decimal places.'
  } else if (Number(amount) <= 0) {
    errors.amount = 'Amount must be greater than zero.'
  }

  if (description.length > 140) {
    errors.description = 'Description must have at most 140 characters.'
  }

  return {
    values: {
      fromAccountId,
      toAccountId,
      amount,
      description,
    },
    errors,
  }
}
