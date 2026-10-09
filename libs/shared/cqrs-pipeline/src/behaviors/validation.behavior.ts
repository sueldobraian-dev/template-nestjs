import { Injectable } from '@nestjs/common';
import { ICommand } from '@nestjs/cqrs';
import { ZodSchema } from 'zod';
import { Result, ValidationError } from '@shared/core';
import { IPipelineBehavior, NextFunction } from './pipeline-behavior.interface';

export interface ValidatableCommand extends ICommand {
  schema?: ZodSchema;
  validate?: () => Result<unknown, ValidationError> | null;
}

@Injectable()
export class ValidationBehavior implements IPipelineBehavior {
  async handle<TCommand extends ICommand, TResponse>(
    command: TCommand,
    next: NextFunction<TResponse>
  ): Promise<TResponse> {
    const validatable = command as ValidatableCommand;

    // 1. Validación basada en Zod Schema
    if (validatable.schema) {
      const parseResult = validatable.schema.safeParse(command);
      if (!parseResult.success) {
        const details = parseResult.error.errors.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return Result.fail(
          new ValidationError('Command validation failed', details)
        ) as TResponse;
      }
    }

    // 2. Validación basada en método validate() si existe
    if (typeof validatable.validate === 'function') {
      const customValidation = validatable.validate();
      if (customValidation && customValidation.isFailure) {
        return customValidation as unknown as TResponse;
      }
    }

    return next();
  }
}
