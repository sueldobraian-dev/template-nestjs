import { AggregateRoot } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { UserRegisteredEvent } from '../application/events/user-registered.event';

export interface UserAggregateProps {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export class UserAggregate extends AggregateRoot {
  private readonly _id: string;
  private readonly _email: string;
  private readonly _name: string;
  private readonly _passwordHash: string;
  private readonly _createdAt: string;

  private constructor(props: UserAggregateProps) {
    super();
    this._id = props.id;
    this._email = props.email;
    this._name = props.name;
    this._passwordHash = props.passwordHash;
    this._createdAt = props.createdAt;
  }

  public get id(): string {
    return this._id;
  }

  public get email(): string {
    return this._email;
  }

  public get name(): string {
    return this._name;
  }

  public get passwordHash(): string {
    return this._passwordHash;
  }

  public get createdAt(): string {
    return this._createdAt;
  }

  public static create(params: {
    email: string;
    name: string;
    passwordHash: string;
  }): UserAggregate {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const user = new UserAggregate({
      id,
      email: params.email,
      name: params.name,
      passwordHash: params.passwordHash,
      createdAt,
    });

    user.apply(new UserRegisteredEvent(id, params.email, params.name, createdAt));

    return user;
  }

  public static reconstitute(props: UserAggregateProps): UserAggregate {
    return new UserAggregate(props);
  }

  public toPrimitives(): UserAggregateProps {
    return {
      id: this._id,
      email: this._email,
      name: this._name,
      passwordHash: this._passwordHash,
      createdAt: this._createdAt,
    };
  }
}
