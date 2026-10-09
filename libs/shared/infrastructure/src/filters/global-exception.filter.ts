import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '@shared/core';
import { RequestContextService } from '../context/request-context.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly contextService: RequestContextService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const correlationId = this.contextService.getCorrelationId();
    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected internal error occurred';
    let details: unknown | null = null;

    if (exception instanceof DomainError) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = exception.details ?? null;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      code = exception.name
        .replace(/Exception$/, '')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toUpperCase();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj['message'] as string) ?? exception.message;
        details = obj['error'] ?? null;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        JSON.stringify({
          correlationId,
          event: 'UnhandledException',
          message: exception.message,
          stack: exception.stack,
        })
      );
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        statusCode,
        details,
      },
      meta: {
        correlationId,
        timestamp,
      },
    });
  }
}
