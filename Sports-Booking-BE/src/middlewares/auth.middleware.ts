import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import { AppError } from '../shared/exceptions'
import { AuthRepository } from '../modules/auth/auth.repository'
import { JwtUtil } from '../shared/utils/jwt'

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Bạn chưa đăng nhập!', StatusCodes.UNAUTHORIZED))
    }

    const accessToken = authHeader.split(' ')[1]

    const payload = JwtUtil.verifyAccessToken(accessToken!)

    const user = await AuthRepository.findById(payload.id)
    if (!user) {
      return next(new AppError('User không tồn tại!', StatusCodes.NOT_FOUND))
    }

    if (user.status === 'banned') {
      return next(new AppError('Tài khoản đã bị khóa!', StatusCodes.FORBIDDEN))
    }

    if (user.status === 'pending_approve') {
      return next(new AppError('Tài khoản chưa được phê duyệt!', StatusCodes.FORBIDDEN))
    }

    req.user = user
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Hết hạn đăng nhập, vui lòng đăng nhập lại', StatusCodes.UNAUTHORIZED))
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Token không hợp lệ!', StatusCodes.UNAUTHORIZED))
    }

    console.error(error)
    return next(new AppError('Lỗi xác thực không xác định', StatusCodes.INTERNAL_SERVER_ERROR))
  }
}
