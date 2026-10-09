import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * DTO para la creación y registro de un nuevo usuario.
 */
export class RegisterUserDto {
  /**
   * Correo electrónico único del usuario.
   * @example "juan.perez@empresa.com"
   */
  @IsEmail({}, { message: 'El correo electrónico ingresado no es válido.' })
  @IsNotEmpty()
  email!: string;

  /**
   * Nombre completo del usuario.
   * @example "Juan Pérez"
   */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * Contraseña de acceso segura. Requiere al menos 8 caracteres.
   * @example "SuperSecret123!"
   */
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password!: string;
}

/**
 * DTO de respuesta con la información pública del usuario registrado.
 */
export class UserResponseDto {
  /**
   * Identificador único UUID v4 asignado al usuario.
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id!: string;

  /**
   * Correo electrónico registrado del usuario.
   * @example "juan.perez@empresa.com"
   */
  email!: string;

  /**
   * Nombre completo registrado del usuario.
   * @example "Juan Pérez"
   */
  name!: string;

  /**
   * Fecha de alta en la plataforma en formato ISO-8601.
   * @example "2026-10-08T23:15:00.000Z"
   */
  createdAt!: string;
}
