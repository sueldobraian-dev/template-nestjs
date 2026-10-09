import { Injectable } from '@nestjs/common';
import { UserRepository } from '../domain/user.repository.port';
import { UserAggregate } from '../domain/user.aggregate';

@Injectable()
export class InMemoryUserRepository extends UserRepository {
  private readonly usersByEmail = new Map<string, UserAggregate>();
  private readonly usersById = new Map<string, UserAggregate>();

  async findByEmail(email: string): Promise<UserAggregate | null> {
    const user = this.usersByEmail.get(email.toLowerCase());
    return user ?? null;
  }

  async save(user: UserAggregate): Promise<void> {
    this.usersByEmail.set(user.email.toLowerCase(), user);
    this.usersById.set(user.id, user);
  }

  // Método auxiliar para testing y reseteo de estado
  public clear(): void {
    this.usersByEmail.clear();
    this.usersById.clear();
  }
}
