export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PersistenceError extends Error {
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'PersistenceError';
    this.cause = cause;
  }
}

export class RunnerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RunnerError';
  }
}
