import { DomainError } from './domain-error';

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized access', details?: unknown) {
    super({
      code: 'UNAUTHORIZED_ACCESS',
      message,
      statusCode: 401,
      details,
    });
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden access', details?: unknown) {
    super({
      code: 'FORBIDDEN_ACCESS',
      message,
      statusCode: 403,
      details,
    });
  }
}
