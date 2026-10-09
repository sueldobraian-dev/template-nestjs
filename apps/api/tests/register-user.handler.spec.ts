import { EventPublisher } from '@nestjs/cqrs';
import { RegisterUserCommandHandler } from '../src/app/users/application/commands/register-user.handler';
import { RegisterUserCommand } from '../src/app/users/application/commands/register-user.command';
import { InMemoryUserRepository } from '../src/app/users/infrastructure/in-memory-user.repository';
import { UserAggregate } from '../src/app/users/domain/user.aggregate';

describe('RegisterUserCommandHandler', () => {
  let handler: RegisterUserCommandHandler;
  let userRepository: InMemoryUserRepository;
  let mockEventPublisher: EventPublisher;
  let mockMergedAggregate: { commit: jest.Mock };

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();

    mockMergedAggregate = {
      commit: jest.fn(),
    };

    mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue(mockMergedAggregate),
    } as unknown as EventPublisher;

    handler = new RegisterUserCommandHandler(userRepository, mockEventPublisher);
  });

  it('should successfully register a new user, persist it, and commit domain events', async () => {
    const command = new RegisterUserCommand(
      'newuser@example.com',
      'John Doe',
      'SecurePass123!'
    );

    const result = await handler.execute(command);

    // 1. Validar Result exitoso
    expect(result.isSuccess).toBe(true);
    expect(result.isFailure).toBe(false);
    expect(result.value).toBeInstanceOf(UserAggregate);
    expect(result.value.email).toBe('newuser@example.com');
    expect(result.value.name).toBe('John Doe');

    // 2. Validar persistencia en repositorio
    const persistedUser = await userRepository.findByEmail('newuser@example.com');
    expect(persistedUser).not.toBeNull();
    expect(persistedUser?.id).toBe(result.value.id);

    // 3. Validar despacho de eventos de dominio
    expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(result.value);
    expect(mockMergedAggregate.commit).toHaveBeenCalledTimes(1);
  });

  it('should return Result.fail with UserAlreadyExistsError (409) when email is already registered', async () => {
    // Registrar previamente al usuario en el repositorio
    const initialCommand = new RegisterUserCommand(
      'duplicate@example.com',
      'Existing User',
      'SecurePass123!'
    );
    await handler.execute(initialCommand);

    // Intentar registrar de nuevo con el mismo email
    const duplicateCommand = new RegisterUserCommand(
      'duplicate@example.com',
      'Another Name',
      'DifferentPass123!'
    );

    const result = await handler.execute(duplicateCommand);

    // 1. Validar que no lance excepción y retorne Result.fail
    expect(result.isSuccess).toBe(false);
    expect(result.isFailure).toBe(true);

    // 2. Validar código y status de error
    expect(result.error.code).toBe('USER_ALREADY_EXISTS');
    expect(result.error.statusCode).toBe(409);
    expect(result.error.message).toContain('duplicate@example.com');

    // 3. Validar que no se haya llamado a commit para el duplicado
    expect(mockMergedAggregate.commit).toHaveBeenCalledTimes(1); // Solo la primera vez
  });
});
