import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.config'

export interface JwtPayload {
  id: number
  email: string
  roleId: number
}

export class JwtUtil {
  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.ACCESS_TOKEN_SECRET_SIGNATURE!, {
      expiresIn: '15m',
      algorithm: 'HS256'
    })
  }

  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.ACCESS_TOKEN_SECRET_SIGNATURE!, {
      expiresIn: '3d',
      algorithm: 'HS256'
    })
  }

  static verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.ACCESS_TOKEN_SECRET_SIGNATURE!) as JwtPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token has expired')
      }
      throw new Error('Invalid access token')
    }
  }

  static verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.REFRESH_TOKEN_SECRET_SIGNATURE!) as JwtPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired')
      }
      throw new Error('Invalid refresh token')
    }
  }

  static decode(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload
    } catch {
      return null
    }
  }

  static isExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any
      if (decoded?.exp) {
        return Date.now() >= decoded.exp * 1000
      }
      return false
    } catch {
      return true
    }
  }

  static hashToken = (token: string) => {
    return crypto.createHash('sha256').update(token).digest('hex')
  }
}
