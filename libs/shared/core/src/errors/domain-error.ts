export abstract class DomainError {
  public readonly code: string;
  public readonly message: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(params: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  }) {
    this.code = params.code;
    this.message = params.message;
    this.statusCode = params.statusCode;
    if (params.details !== undefined) {
      this.details = params.details;
    }
  }
}
