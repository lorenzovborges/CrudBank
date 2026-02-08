import Decimal from 'decimal.js';
import { DomainError } from '../errors/DomainError';

function toNormalizedAmount(rawAmount: unknown, fieldName: string): Decimal {
  if (rawAmount === null || rawAmount === undefined) {
    throw DomainError.validationField(fieldName, 'Amount is required');
  }

  let amount: Decimal;
  try {
    amount = new Decimal(String(rawAmount));
  } catch {
    throw DomainError.validationField(fieldName, 'Amount is required');
  }

  if (amount.decimalPlaces() > 2) {
    throw DomainError.validationField(fieldName, 'Amount must have at most 2 decimal places');
  }

  return amount.toDecimalPlaces(2);
}

export function validatePositiveAmount(rawAmount: unknown, fieldName = 'amount'): Decimal {
  const normalized = toNormalizedAmount(rawAmount, fieldName);

  if (normalized.lte(0)) {
    throw DomainError.validationField(fieldName, 'Amount must be greater than zero');
  }

  return normalized;
}

export function validateNonNegativeAmount(rawAmount: unknown, fieldName = 'amount'): Decimal {
  const normalized = toNormalizedAmount(rawAmount, fieldName);

  if (normalized.lt(0)) {
    throw DomainError.validationField(fieldName, 'Amount must be zero or greater');
  }

  return normalized;
}
