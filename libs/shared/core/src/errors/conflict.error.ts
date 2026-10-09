import { DomainError } from './domain-error';

export class ConflictError extends DomainError {
  constructor(message: string, code = 'CONFLICT_ERROR', details?: unknown) {
    super({
      code,
      message,
      statusCode: 409,
      details,
    });
  }
}
