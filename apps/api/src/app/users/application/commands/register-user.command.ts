import { ICommand } from '@nestjs/cqrs';
import { z } from 'zod';
import { ValidatableCommand } from '@shared/cqrs-pipeline';

export class RegisterUserCommand implements ValidatableCommand, ICommand {
  public static readonly schema = z.object({
    email: z.string().email('Email must be a valid email address'),
    name: z.string().min(2, 'Name must be at least 2 characters long'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  });

  public readonly schema = RegisterUserCommand.schema;

  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly password: string
  ) {}
}
