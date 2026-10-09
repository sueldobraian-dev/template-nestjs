import { UserAggregate } from './user.aggregate';

export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<UserAggregate | null>;
  abstract save(user: UserAggregate): Promise<void>;
}
