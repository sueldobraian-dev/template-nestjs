import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import {
  InfrastructureModule,
  ResponseEnvelopeInterceptor,
  GlobalExceptionFilter,
} from '@shared/infrastructure';
import { CqrsPipelineModule } from '@shared/cqrs-pipeline';
import { UsersModule } from './users/users.module';

@Module({
  imports: [InfrastructureModule, CqrsPipelineModule, UsersModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseEnvelopeInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
