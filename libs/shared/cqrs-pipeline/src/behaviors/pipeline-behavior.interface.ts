import { ICommand } from '@nestjs/cqrs';

export type NextFunction<TResponse> = () => Promise<TResponse>;

export interface IPipelineBehavior {
  handle<TCommand extends ICommand, TResponse>(
    command: TCommand,
    next: NextFunction<TResponse>
  ): Promise<TResponse>;
}

export const PIPELINE_BEHAVIORS = Symbol('PIPELINE_BEHAVIORS');
