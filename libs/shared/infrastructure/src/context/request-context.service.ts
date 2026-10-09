import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextStore {
  correlationId: string;
  userId?: string;
  timestamp: string;
}

@Injectable()
export class RequestContextService {
  private static readonly storage = new AsyncLocalStorage<RequestContextStore>();

  public runWithContext<R>(store: RequestContextStore, fn: () => R): R {
    return RequestContextService.storage.run(store, fn);
  }

  public getStore(): RequestContextStore | undefined {
    return RequestContextService.storage.getStore();
  }

  public getCorrelationId(): string {
    const store = this.getStore();
    return store?.correlationId ?? 'no-correlation-id';
  }
}
