import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';
import { createHash } from 'node:crypto';
import { Result, DomainError } from '@shared/core';
import { RegisterUserCommand } from './register-user.command';
import { UserRepository } from '../../domain/user.repository.port';
import { UserAggregate } from '../../domain/user.aggregate';
import { UserAlreadyExistsError } from '../../domain/errors/user-already-exists.error';

@CommandHandler(RegisterUserCommand)
export class RegisterUserCommandHandler
  implements ICommandHandler<RegisterUserCommand, Result<UserAggregate, DomainError>>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly publisher: EventPublisher
  ) {}

  async execute(
    command: RegisterUserCommand
  ): Promise<Result<UserAggregate, DomainError>> {
    // 1. Verificación de reglas de negocio (duplicidad de email)
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      return Result.fail(new UserAlreadyExistsError(command.email));
    }

    // 2. Hash de contraseña
    const passwordHash = createHash('sha256')
      .update(command.password)
      .digest('hex');

    // 3. Creación del agregado de dominio (registra UserRegisteredEvent en memoria)
    const userAggregate = UserAggregate.create({
      email: command.email,
      name: command.name,
      passwordHash,
    });

    // 4. Persistencia en base de datos / repositorio
    await this.userRepository.save(userAggregate);

    // 5. Despacho de eventos de dominio post-persistencia
    const userWithEvents = this.publisher.mergeObjectContext(userAggregate);
    userWithEvents.commit();

    return Result.ok(userAggregate);
  }
}
