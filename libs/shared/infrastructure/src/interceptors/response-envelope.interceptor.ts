import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { Result, DomainError } from '@shared/core';
import { RequestContextService } from '../context/request-context.service';

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: {
    correlationId: string;
    timestamp: string;
  };
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details: unknown | null;
  };
  meta: {
    correlationId: string;
    timestamp: string;
  };
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly contextService: RequestContextService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<SuccessEnvelope<unknown> | ErrorEnvelope> {
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((body: unknown) => {
        const correlationId = this.contextService.getCorrelationId();
        const timestamp = new Date().toISOString();

        // Si el valor devuelto es una instancia de Result
        if (body instanceof Result) {
          if (body.isSuccess) {
            return {
              success: true,
              data: body.value,
              meta: {
                correlationId,
                timestamp,
              },
            };
          }

          // Si es un Result.fail
          const err: DomainError = body.error;
          response.status(err.statusCode);
          return {
            success: false,
            error: {
              code: err.code,
              message: err.message,
              statusCode: err.statusCode,
              details: err.details ?? null,
            },
            meta: {
              correlationId,
              timestamp,
            },
          };
        }

        // Si ya viene formateado como envoltorio estándar
        if (body && typeof body === 'object' && 'success' in body) {
          return body as SuccessEnvelope<unknown> | ErrorEnvelope;
        }

        return {
          success: true,
          data: body,
          meta: {
            correlationId,
            timestamp,
          },
        };
      })
    );
  }
}
