import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserRegisteredEvent } from './user-registered.event';
import { NotificationServicePort } from '../../domain/ports/notification-service.port';

@EventsHandler(UserRegisteredEvent)
export class SendWelcomeEmailEventHandler
  implements IEventHandler<UserRegisteredEvent>
{
  private readonly logger = new Logger(SendWelcomeEmailEventHandler.name);

  constructor(private readonly notificationService: NotificationServicePort) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    this.logger.log(
      JSON.stringify({
        event: 'SendWelcomeEmail',
        recipient: event.email,
        userId: event.userId,
        timestamp: event.occurredAt,
        message: `Welcome email dispatched successfully to ${event.name}`,
      })
    );

    await this.notificationService.sendWelcomeEmail(event.email, event.name);
  }
}
