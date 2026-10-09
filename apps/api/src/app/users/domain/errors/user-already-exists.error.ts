import { ConflictError } from '@shared/core';

export class UserAlreadyExistsError extends ConflictError {
  constructor(email: string) {
    super(`User with email '${email}' already exists`, 'USER_ALREADY_EXISTS', {
      email,
    });
  }
}
