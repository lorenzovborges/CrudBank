const DIGITS_ONLY = /\D/g

function isRepeatedDigits(value: string): boolean {
  return /^([0-9])\1+$/.test(value)
}

function calculateCpfVerifier(cpf: string, length: number): number {
  let sum = 0
  let weight = length + 1

  for (let index = 0; index < length; index += 1) {
    sum += Number(cpf[index]) * weight
    weight -= 1
  }

  const remainder = 11 - (sum % 11)
  return remainder >= 10 ? 0 : remainder
}

function calculateCnpjVerifier(cnpj: string, length: number): number {
  const weights =
    length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  let sum = 0
  for (let index = 0; index < length; index += 1) {
    sum += Number(cnpj[index]) * weights[index]
  }

  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11 || isRepeatedDigits(cpf)) {
    return false
  }

  const first = calculateCpfVerifier(cpf, 9)
  const second = calculateCpfVerifier(cpf, 10)
  return Number(cpf[9]) === first && Number(cpf[10]) === second
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || isRepeatedDigits(cnpj)) {
    return false
  }

  const first = calculateCnpjVerifier(cnpj, 12)
  const second = calculateCnpjVerifier(cnpj, 13)
  return Number(cnpj[12]) === first && Number(cnpj[13]) === second
}

export function normalizeDocument(value: string): string {
  return value.replace(DIGITS_ONLY, '')
}

export function isValidBrazilDocument(rawValue: string): boolean {
  const document = normalizeDocument(rawValue)
  if (document.length === 11) {
    return isValidCpf(document)
  }
  if (document.length === 14) {
    return isValidCnpj(document)
  }
  return false
}
