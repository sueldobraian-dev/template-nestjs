import { z } from 'zod';
import { ICommand } from '@nestjs/cqrs';
import { Result } from '@shared/core';
import { RequestContextService } from '@shared/infrastructure';
import { ValidationBehavior } from '../src/behaviors/validation.behavior';
import { LoggingBehavior } from '../src/behaviors/logging.behavior';
import { PipelineCommandBus } from '../src/bus/pipeline-command-bus';
import { IPipelineBehavior } from '../src/behaviors/pipeline-behavior.interface';

class MockTestCommand implements ICommand {
  public static readonly schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });

  public readonly schema = MockTestCommand.schema;

  constructor(public readonly email: string, public readonly password: string) {}
}

describe('CQRS Pipeline Behaviors', () => {
  describe('ValidationBehavior', () => {
    let behavior: ValidationBehavior;

    beforeEach(() => {
      behavior = new ValidationBehavior();
    });

    it('should allow valid command to reach next handler', async () => {
      const command = new MockTestCommand('valid@company.com', 'SuperSecret123');
      const next = jest.fn().mockResolvedValue(Result.ok({ id: '1' }));

      const response = await behavior.handle(command, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect((response as Result<{ id: string }>).isSuccess).toBe(true);
    });

    it('should short-circuit and return Result.fail(ValidationError) on invalid input', async () => {
      const command = new MockTestCommand('invalid-email', 'short');
      const next = jest.fn();

      const response = await behavior.handle(command, next);

      expect(next).not.toHaveBeenCalled();
      const result = response as Result<unknown>;
      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('VALIDATION_FAILED');
      expect(result.error.statusCode).toBe(422);
    });
  });

  describe('LoggingBehavior', () => {
    let behavior: LoggingBehavior;
    let contextService: RequestContextService;

    beforeEach(() => {
      contextService = new RequestContextService();
      jest.spyOn(contextService, 'getCorrelationId').mockReturnValue('corr-test-log');
      behavior = new LoggingBehavior(contextService);
    });

    it('should measure execution time and return next result', async () => {
      const command = new MockTestCommand('user@domain.com', 'Pass123456');
      const next = jest.fn().mockResolvedValue(Result.ok('success_response'));

      const response = await behavior.handle(command, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(response).toEqual(Result.ok('success_response'));
    });
  });

  describe('PipelineCommandBus', () => {
    it('should execute behaviors in pipeline sequence before handler', async () => {
      const commandBusMock = {
        execute: jest.fn().mockResolvedValue(Result.ok('executed_by_nest_cqrs')),
      };

      const executionOrder: string[] = [];

      const behavior1: IPipelineBehavior = {
        handle: async <TCommand, TResponse>(
          _cmd: TCommand,
          next: () => Promise<TResponse>
        ): Promise<TResponse> => {
          executionOrder.push('behavior1:start');
          const res = await next();
          executionOrder.push('behavior1:end');
          return res;
        },
      };

      const behavior2: IPipelineBehavior = {
        handle: async <TCommand, TResponse>(
          _cmd: TCommand,
          next: () => Promise<TResponse>
        ): Promise<TResponse> => {
          executionOrder.push('behavior2:start');
          const res = await next();
          executionOrder.push('behavior2:end');
          return res;
        },
      };

      const bus = new PipelineCommandBus(commandBusMock as any, [
        behavior1,
        behavior2,
      ]);

      const command = new MockTestCommand('user@domain.com', 'Pass123456');
      const result = await bus.execute(command);

      expect(executionOrder).toEqual([
        'behavior1:start',
        'behavior2:start',
        'behavior2:end',
        'behavior1:end',
      ]);
      expect(commandBusMock.execute).toHaveBeenCalledWith(command);
      expect((result as Result<string>).value).toBe('executed_by_nest_cqrs');
    });
  });
});
