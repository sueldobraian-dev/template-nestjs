import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestContextService } from './context/request-context.service';
import { CorrelationIdMiddleware } from './context/correlation-id.middleware';
import { ResponseEnvelopeInterceptor } from './interceptors/response-envelope.interceptor';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

import { OAuth2TokenService } from './http/oauth2-token.service';
import { DirectHttpClientService } from './http/direct-http-client.service';
import { ApiManagerHttpClientService } from './http/api-manager-http-client.service';

@Global()
@Module({
  providers: [
    RequestContextService,
    ResponseEnvelopeInterceptor,
    GlobalExceptionFilter,
    OAuth2TokenService,
    DirectHttpClientService,
    ApiManagerHttpClientService,
  ],
  exports: [
    RequestContextService,
    ResponseEnvelopeInterceptor,
    GlobalExceptionFilter,
    OAuth2TokenService,
    DirectHttpClientService,
    ApiManagerHttpClientService,
  ],
})
export class InfrastructureModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
