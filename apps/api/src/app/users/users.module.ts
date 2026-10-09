import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserRepository } from './domain/user.repository.port';
import { InMemoryUserRepository } from './infrastructure/in-memory-user.repository';
import { RegisterUserCommandHandler } from './application/commands/register-user.handler';
import { SendWelcomeEmailEventHandler } from './application/events/send-welcome-email.handler';
import { UsersController } from './presentation/users.controller';

import { NotificationServicePort } from './domain/ports/notification-service.port';
import { DirectNotificationAdapter } from './infrastructure/adapters/direct-notification.adapter';
import { IdentityVerificationPort } from './domain/ports/identity-verification.port';
import { ApiManagerIdentityVerificationAdapter } from './infrastructure/adapters/apimanager-identity-verification.adapter';

@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [
    {
      provide: UserRepository,
      useClass: InMemoryUserRepository,
    },
    {
      provide: NotificationServicePort,
      useClass: DirectNotificationAdapter,
    },
    {
      provide: IdentityVerificationPort,
      useClass: ApiManagerIdentityVerificationAdapter,
    },
    RegisterUserCommandHandler,
    SendWelcomeEmailEventHandler,
  ],
  exports: [UserRepository, NotificationServicePort, IdentityVerificationPort],
})
export class UsersModule {}
