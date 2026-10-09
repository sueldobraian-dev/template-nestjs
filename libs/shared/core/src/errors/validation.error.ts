import { DomainError } from './domain-error';

export class ValidationError extends DomainError {
  constructor(message = 'Validation failed', details?: unknown) {
    super({
      code: 'VALIDATION_FAILED',
      message,
      statusCode: 422,
      details,
    });
  }
}
