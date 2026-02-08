import { DomainError } from '../errors/DomainError';
import { normalizeAndValidateBrazilDocument } from './documentValidator';

const ACCOUNT_NUMBER_PATTERN = /^\d{5,12}(-\d{1})?$/;

export function normalizeOwnerName(ownerName: string): string {
  if (!ownerName || ownerName.trim().length === 0) {
    throw DomainError.validationField('ownerName', 'Owner name is required');
  }

  const normalized = ownerName.trim().replace(/\s+/g, ' ');
  if (normalized.length < 3 || normalized.length > 120) {
    throw DomainError.validationField('ownerName', 'Owner name must be between 3 and 120 characters');
  }

  return normalized;
}

export function normalizeDocument(document: string): string {
  return normalizeAndValidateBrazilDocument(document);
}

export function normalizeBranch(branch: string): string {
  if (!branch || branch.trim().length === 0) {
    throw DomainError.validationField('branch', 'Branch is required');
  }

  const normalized = branch.replace(/\D/g, '');
  if (normalized.length !== 4) {
    throw DomainError.validationField('branch', 'Branch must contain exactly 4 digits');
  }

  return normalized;
}

export function normalizeAccountNumber(number: string): string {
  if (!number || number.trim().length === 0) {
    throw DomainError.validationField('number', 'Account number is required');
  }

  const normalized = number.trim().replace(/\s+/g, '');
  if (!ACCOUNT_NUMBER_PATTERN.test(normalized)) {
    throw DomainError.validationField('number', 'Account number must match 12345 or 12345-6 pattern');
  }

  return normalized;
}
