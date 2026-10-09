import { DomainError } from '../errors/domain-error';

export class Result<T, E extends DomainError = DomainError> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  private readonly _value?: T;
  private readonly _error?: E;

  private constructor(isSuccess: boolean, value?: T, error?: E) {
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    if (value !== undefined) {
      this._value = value;
    }
    if (error !== undefined) {
      this._error = error;
    }
    Object.freeze(this);
  }

  public get value(): T {
    if (this.isFailure) {
      throw new Error(
        `Cannot access 'value' on a failed Result. Error code: ${this._error?.code}, message: ${this._error?.message}`
      );
    }
    return this._value as T;
  }

  public get error(): E {
    if (this.isSuccess) {
      throw new Error("Cannot access 'error' on a successful Result.");
    }
    return this._error as E;
  }

  public static ok<T, E extends DomainError = DomainError>(value: T): Result<T, E> {
    return new Result<T, E>(true, value, undefined);
  }

  public static fail<E extends DomainError, T = never>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  public map<U>(fn: (val: T) => U): Result<U, E> {
    if (this.isFailure) {
      return Result.fail<E, U>(this._error as E);
    }
    return Result.ok<U, E>(fn(this.value));
  }

  public mapError<F extends DomainError>(fn: (err: E) => F): Result<T, F> {
    if (this.isSuccess) {
      return Result.ok<T, F>(this.value);
    }
    return Result.fail<F, T>(fn(this.error));
  }
}
