import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestContextService } from './request-context.service';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly contextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const headerValue = req.headers['x-correlation-id'];
    const correlationId =
      typeof headerValue === 'string' && headerValue.trim().length > 0
        ? headerValue
        : randomUUID();

    res.setHeader('x-correlation-id', correlationId);

    const store = {
      correlationId,
      timestamp: new Date().toISOString(),
    };

    this.contextService.runWithContext(store, () => {
      next();
    });
  }
}
