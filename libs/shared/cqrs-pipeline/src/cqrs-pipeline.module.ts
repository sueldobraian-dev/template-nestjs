import { Module, Global } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { LoggingBehavior } from './behaviors/logging.behavior';
import { ValidationBehavior } from './behaviors/validation.behavior';
import { PIPELINE_BEHAVIORS } from './behaviors/pipeline-behavior.interface';
import { PipelineCommandBus } from './bus/pipeline-command-bus';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [
    LoggingBehavior,
    ValidationBehavior,
    {
      provide: PIPELINE_BEHAVIORS,
      useFactory: (logging: LoggingBehavior, validation: ValidationBehavior) => [
        logging,
        validation,
      ],
      inject: [LoggingBehavior, ValidationBehavior],
    },
    PipelineCommandBus,
  ],
  exports: [CqrsModule, PipelineCommandBus, PIPELINE_BEHAVIORS],
})
export class CqrsPipelineModule {}
