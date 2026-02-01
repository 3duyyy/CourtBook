import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { AppError } from '../exceptions'

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Set giá trị mặc định nếu err không có
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'

  // Xử lý riêng các lỗi đặc thù (MySQL, JWT,...)
  // Duplicate Entry (Mã lỗi ER_DUP_ENTRY thường là 1062)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    const msg = 'Dữ liệu bị trùng lặp (duplicate entry). Vui lòng kiểm tra lại!'
    err = new AppError(msg, StatusCodes.CONFLICT)
  }

  // Token expired
  if (err.name === 'TokenExpiredError') {
    err = new AppError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!', StatusCodes.UNAUTHORIZED)
  }

  // Token invalid
  if (err.name === 'JsonWebTokenError') {
    err = new AppError('Token không hợp lệ', StatusCodes.UNAUTHORIZED)
  }

  // Log error on development environment
  if (process.env.NODE_ENV === 'development') {
    console.log('Error: ', err)
  }

  // Send response to client
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    // Only display stack trace on development environment
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
}
