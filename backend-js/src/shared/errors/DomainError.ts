import type { ErrorCode } from './errorCodes';

export class DomainError extends Error {
  public readonly code: ErrorCode;
  public readonly details: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }

  static notFound(message: string): DomainError {
    return new DomainError('NOT_FOUND', message);
  }

  static validation(message: string, details: Record<string, unknown> = {}): DomainError {
    return new DomainError('VALIDATION_ERROR', message, details);
  }

  static validationField(field: string, message: string): DomainError {
    return DomainError.validation(message, {
      violations: [{ field, message }],
    });
  }

  static badRequest(message: string): DomainError {
    return new DomainError('BAD_REQUEST', message);
  }

  static conflict(message: string): DomainError {
    return new DomainError('CONFLICT', message);
  }

  static insufficientFunds(message: string): DomainError {
    return new DomainError('INSUFFICIENT_FUNDS', message);
  }

  static accountInactive(message: string): DomainError {
    return new DomainError('ACCOUNT_INACTIVE', message);
  }

  static rateLimited(message: string, retryAfterSeconds: number): DomainError {
    return new DomainError('RATE_LIMITED', message, {
      retryAfterSeconds,
    });
  }
}
