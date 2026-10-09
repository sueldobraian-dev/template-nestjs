import { Inject, Injectable } from '@nestjs/common';
import { CommandBus, ICommand } from '@nestjs/cqrs';
import {
  IPipelineBehavior,
  PIPELINE_BEHAVIORS,
  NextFunction,
} from '../behaviors/pipeline-behavior.interface';

@Injectable()
export class PipelineCommandBus {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(PIPELINE_BEHAVIORS)
    private readonly behaviors: IPipelineBehavior[]
  ) {}

  public async execute<TCommand extends ICommand, TResult = unknown>(
    command: TCommand
  ): Promise<TResult> {
    let currentNext: NextFunction<TResult> = () =>
      this.commandBus.execute<TCommand, TResult>(command);

    for (let i = this.behaviors.length - 1; i >= 0; i--) {
      const behavior = this.behaviors[i];
      const next = currentNext;
      currentNext = () => behavior.handle(command, next);
    }

    return currentNext();
  }
}
