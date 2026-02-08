import { DomainError } from '../../src/shared/errors/DomainError';

describe('DomainError factories', () => {
  it('creates all expected error codes with details', () => {
    expect(DomainError.notFound('x').code).toBe('NOT_FOUND');
    expect(DomainError.validation('x').code).toBe('VALIDATION_ERROR');
    expect(DomainError.validationField('field', 'msg').details).toEqual({
      violations: [{ field: 'field', message: 'msg' }],
    });
    expect(DomainError.badRequest('x').code).toBe('BAD_REQUEST');
    expect(DomainError.conflict('x').code).toBe('CONFLICT');
    expect(DomainError.insufficientFunds('x').code).toBe('INSUFFICIENT_FUNDS');
    expect(DomainError.accountInactive('x').code).toBe('ACCOUNT_INACTIVE');
    expect(DomainError.rateLimited('x', 2).details).toEqual({ retryAfterSeconds: 2 });
  });
});
