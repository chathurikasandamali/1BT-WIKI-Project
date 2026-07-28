/**
 * Custom application error class.
 * Use this for all domain and HTTP errors — never use `new Error()` directly.
 */

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;

    // Maintains proper stack trace in V8
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
