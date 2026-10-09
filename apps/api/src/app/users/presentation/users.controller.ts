import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Result, DomainError } from '@shared/core';
import { PipelineCommandBus } from '@shared/cqrs-pipeline';
import { RegisterUserCommand } from '../application/commands/register-user.command';
import { RegisterUserDto, UserResponseDto } from './dtos/register-user.dto';
import { UserAggregate } from '../domain/user.aggregate';

/**
 * Control de endpoints para la gestión de usuarios.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly commandBus: PipelineCommandBus) {}

  /**
   * Registrar un nuevo usuario.
   *
   * Procesa la solicitud mediante validación Zod/class-validator y despacha el comando a través del bus de CQRS Pipeline.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterUserDto
  ): Promise<Result<UserResponseDto, DomainError>> {
    const command = new RegisterUserCommand(dto.email, dto.name, dto.password);
    const result = await this.commandBus.execute<
      RegisterUserCommand,
      Result<UserAggregate, DomainError>
    >(command);

    return result.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    }));
  }
}
