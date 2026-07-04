export type FandangoErrorCode =
  | "FORBIDDEN_ENDPOINT"
  | "NO_LOCATION"
  | "REQUEST_TIMEOUT"
  | "SCHEMA_CHANGED"
  | "UPSTREAM_HTTP_ERROR"
  | "UPSTREAM_PARSE_ERROR";

export class FandangoError extends Error {
  readonly code: FandangoErrorCode;
  readonly details: Record<string, unknown> | undefined;
  readonly userMessage: string;

  constructor(code: FandangoErrorCode, message: string, details?: Record<string, unknown>) {
    super(`${code}: ${message}`);
    this.name = "FandangoError";
    this.code = code;
    this.userMessage = message;
    this.details = details;
  }

  toResult(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.userMessage,
        ...(this.details === undefined ? {} : { details: this.details }),
      },
    };
  }
}
