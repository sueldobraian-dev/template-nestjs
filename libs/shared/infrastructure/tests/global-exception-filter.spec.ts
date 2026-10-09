import { ArgumentsHost, HttpStatus, NotFoundException } from '@nestjs/common';
import { GlobalExceptionFilter } from '../src/filters/global-exception.filter';
import { RequestContextService } from '../src/context/request-context.service';
import { ConflictError } from '@shared/core';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let contextService: RequestContextService;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    contextService = new RequestContextService();
    jest.spyOn(contextService, 'getCorrelationId').mockReturnValue('test-corr-id-123');

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ArgumentsHost;

    filter = new GlobalExceptionFilter(contextService);
  });

  it('should correctly format a DomainError (ConflictError 409)', () => {
    const error = new ConflictError('User already exists', 'USER_ALREADY_EXISTS');

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          code: 'USER_ALREADY_EXISTS',
          message: 'User already exists',
          statusCode: 409,
          details: null,
        },
        meta: expect.objectContaining({
          correlationId: 'test-corr-id-123',
        }),
      })
    );
  });

  it('should correctly format a NestJS HttpException (NotFoundException 404)', () => {
    const exception = new NotFoundException('Resource not found');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          statusCode: 404,
          message: 'Resource not found',
        }),
        meta: expect.objectContaining({
          correlationId: 'test-corr-id-123',
        }),
      })
    );
  });

  it('should sanitize unexpected generic Error to 500 without leaking stack traces', () => {
    const error = new Error('Database password leak or internal failure');

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected internal error occurred',
          statusCode: 500,
          details: null,
        },
        meta: expect.objectContaining({
          correlationId: 'test-corr-id-123',
        }),
      })
    );
  });
});
