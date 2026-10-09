import { Injectable, Logger } from '@nestjs/common';
import { ICommand } from '@nestjs/cqrs';
import { Result } from '@shared/core';
import { RequestContextService } from '@shared/infrastructure';
import { IPipelineBehavior, NextFunction } from './pipeline-behavior.interface';

const SENSITIVE_KEYS = new Set(['password', 'token', 'secret', 'authorization', 'apiKey']);

@Injectable()
export class LoggingBehavior implements IPipelineBehavior {
  private readonly logger = new Logger('CommandPipeline');

  constructor(private readonly contextService: RequestContextService) {}

  async handle<TCommand extends ICommand, TResponse>(
    command: TCommand,
    next: NextFunction<TResponse>
  ): Promise<TResponse> {
    const commandName = command.constructor.name;
    const correlationId = this.contextService.getCorrelationId();
    const sanitizedPayload = this.sanitize(command);
    const startTime = performance.now();

    try {
      const response = await next();
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

      let status = 'Success';
      let errorCode: string | undefined;

      if (response instanceof Result && response.isFailure) {
        status = 'Failed';
        errorCode = response.error.code;
      }

      this.logger.log(
        JSON.stringify({
          correlationId,
          command: commandName,
          status,
          durationMs,
          errorCode,
          payload: sanitizedPayload,
        })
      );

      return response;
    } catch (error) {
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      this.logger.error(
        JSON.stringify({
          correlationId,
          command: commandName,
          status: 'Exception',
          durationMs,
          error: error instanceof Error ? error.message : String(error),
          payload: sanitizedPayload,
        })
      );
      throw error;
    }
  }

  private sanitize(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitize(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
