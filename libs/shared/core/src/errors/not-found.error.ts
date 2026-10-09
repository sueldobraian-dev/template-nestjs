import { DomainError } from './domain-error';

export class NotFoundError extends DomainError {
  constructor(message: string, code = 'NOT_FOUND', details?: unknown) {
    super({
      code,
      message,
      statusCode: 404,
      details,
    });
  }
}
