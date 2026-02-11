import { NextFunction, Request, Response } from 'express'
import { AuthService } from './auth.service'
import { env } from '../../config/env.config'
import { StatusCodes } from 'http-status-codes'
import { AppError } from '../../shared/exceptions'
import { JwtUtil } from '../../shared/utils/jwt'

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body)

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3 * 24 * 60 * 60 * 1000
      })

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken
        },
        message: 'Đăng ký thành công!'
      })
    } catch (error) {
      next(error)
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body)

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3 * 24 * 60 * 60 * 1000
      })

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken
        },
        message: 'Đăng nhập thành công'
      })
    } catch (error) {
      next(error)
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken
      if (!refreshToken) {
        throw new AppError('Refresh token không tồn tại!', StatusCodes.UNAUTHORIZED)
      }

      const result = await AuthService.refreshToken(refreshToken)

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          accessToken: result.accessToken
        },
        message: 'Làm mới token thành công'
      })
    } catch (error) {
      next(error)
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken
      if (!refreshToken) {
        return next(new AppError('Refresh token không tồn tại', StatusCodes.UNAUTHORIZED))
      }

      await AuthService.logout(refreshToken)
      res.clearCookie('refreshToken')

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Logout thành công'
      })
    } catch (error) {
      next(error)
    }
  }

  static async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken
      if (!refreshToken) {
        return next(new AppError('Refresh token không tồn tại', StatusCodes.UNAUTHORIZED))
      }

      const payload = JwtUtil.decode(refreshToken)
      if (!payload) {
        return next(new AppError('Token không hợp lệ', StatusCodes.UNAUTHORIZED))
      }

      await AuthService.logoutAllDevices(payload.id)
      res.clearCookie('refreshToken')

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Logout tất cả thiết bị thành công'
      })
    } catch (error) {
      next(error)
    }
  }
}
