export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly errors: any[] | undefined;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, errors?: any[]) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    // Đánh dấu đây là lỗi vận hành (Operational) - tức là lỗi mình đã lường trước để phân biệt với lỗi lập trình (Programming Error)
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);

    if (process.env.NODE_ENV === "development") {
      console.error(`[${this.name}]: ${message}`, errors);
    }
  }
}
