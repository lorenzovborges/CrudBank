import { DomainError } from '../errors/DomainError';

function isRepeatedDigits(value: string): boolean {
  return /^([0-9])\1+$/.test(value);
}

function calculateCpfVerifier(cpf: string, length: number): number {
  let sum = 0;
  let weight = length + 1;

  for (let index = 0; index < length; index += 1) {
    sum += Number(cpf[index]) * weight;
    weight -= 1;
  }

  const remainder = 11 - (sum % 11);
  return remainder >= 10 ? 0 : remainder;
}

function calculateCnpjVerifier(cnpj: string, length: number): number {
  const weights =
    length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += Number(cnpj[index]) * weights[index];
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11 || isRepeatedDigits(cpf)) {
    return false;
  }

  const firstDigit = calculateCpfVerifier(cpf, 9);
  const secondDigit = calculateCpfVerifier(cpf, 10);
  return Number(cpf[9]) === firstDigit && Number(cpf[10]) === secondDigit;
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || isRepeatedDigits(cnpj)) {
    return false;
  }

  const firstDigit = calculateCnpjVerifier(cnpj, 12);
  const secondDigit = calculateCnpjVerifier(cnpj, 13);
  return Number(cnpj[12]) === firstDigit && Number(cnpj[13]) === secondDigit;
}

export function normalizeAndValidateBrazilDocument(rawDocument: string): string {
  if (!rawDocument || rawDocument.trim().length === 0) {
    throw DomainError.validationField('document', 'Document is required');
  }

  const normalized = rawDocument.replace(/\D/g, '');

  if (normalized.length === 11 && isValidCpf(normalized)) {
    return normalized;
  }

  if (normalized.length === 14 && isValidCnpj(normalized)) {
    return normalized;
  }

  throw DomainError.validationField('document', 'Document must be a valid CPF or CNPJ');
}
