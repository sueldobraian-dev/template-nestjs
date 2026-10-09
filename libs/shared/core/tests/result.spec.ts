import { Result } from '../src/result/result';
import { ConflictError } from '../src/errors/conflict.error';
import { ValidationError } from '../src/errors/validation.error';

describe('Result Pattern', () => {
  describe('Result.ok', () => {
    it('should create a successful result with value', () => {
      const data = { id: '123', name: 'Test' };
      const result = Result.ok(data);

      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.value).toEqual(data);
    });

    it('should throw an error when accessing error on success', () => {
      const result = Result.ok('success_value');

      expect(() => result.error).toThrow("Cannot access 'error' on a successful Result.");
    });

    it('should map value when Result is successful', () => {
      const result = Result.ok(10);
      const mapped = result.map((n) => n * 2);

      expect(mapped.isSuccess).toBe(true);
      expect(mapped.value).toBe(20);
    });
  });

  describe('Result.fail', () => {
    it('should create a failure result with DomainError', () => {
      const error = new ConflictError('User already exists', 'USER_ALREADY_EXISTS');
      const result = Result.fail(error);

      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
      expect(result.error.code).toBe('USER_ALREADY_EXISTS');
      expect(result.error.statusCode).toBe(409);
    });

    it('should throw an error when accessing value on failure', () => {
      const error = new ValidationError('Invalid email format');
      const result = Result.fail(error);

      expect(() => result.value).toThrow(/Cannot access 'value' on a failed Result/);
    });

    it('should bypass map when Result is failure', () => {
      const error = new ValidationError('Invalid input');
      const result = Result.fail<ValidationError, number>(error);
      const mapped = result.map((n) => n * 2);

      expect(mapped.isFailure).toBe(true);
      expect(mapped.error).toBe(error);
    });
  });
});
