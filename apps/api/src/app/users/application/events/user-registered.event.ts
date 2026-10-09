import { IEvent } from '@nestjs/cqrs';

export class UserRegisteredEvent implements IEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly occurredAt: string
  ) {}
}
