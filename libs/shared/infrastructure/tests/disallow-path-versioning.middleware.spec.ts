import { BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { DisallowPathVersioningMiddleware } from '../src/middleware/disallow-path-versioning.middleware';

describe('DisallowPathVersioningMiddleware', () => {
  let middleware: DisallowPathVersioningMiddleware;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new DisallowPathVersioningMiddleware();
    mockResponse = {};
    mockNext = jest.fn();
  });

  it('should allow clean routes without versioning prefixes in path', () => {
    const mockRequest = {
      path: '/api/users',
      originalUrl: '/api/users',
    } as Request;

    middleware.use(mockRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should allow query string versioning (e.g. /api/users?api-version=1)', () => {
    const mockRequest = {
      path: '/api/users',
      originalUrl: '/api/users?api-version=1',
    } as Request;

    middleware.use(mockRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should throw BadRequestException when path includes /v1/ prefix', () => {
    const mockRequest = {
      path: '/api/v1/users',
      originalUrl: '/api/v1/users',
    } as Request;

    expect(() => {
      middleware.use(mockRequest, mockResponse as Response, mockNext);
    }).toThrow(BadRequestException);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when path includes /v2 prefix', () => {
    const mockRequest = {
      path: '/v2/products',
      originalUrl: '/v2/products',
    } as Request;

    expect(() => {
      middleware.use(mockRequest, mockResponse as Response, mockNext);
    }).toThrow(BadRequestException);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
