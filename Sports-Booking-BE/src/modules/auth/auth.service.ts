import { StatusCodes } from 'http-status-codes'
import { LoginDto, RegisterDto } from '../../dtos/auth.dto'
import { AppError } from '../../shared/exceptions'
import { AuthRepository } from './auth.repository'
import bcrypt from 'bcryptjs'
import { BcryptUtil } from '../../shared/utils/bcryptUtil'
import { JwtUtil } from '../../shared/utils/jwt'

export class AuthService {
  static async register(registerDto: RegisterDto) {
    const existingUser = await AuthRepository.findByEmail(registerDto.email)
    if (existingUser) {
      throw new AppError('Email đã tồn tại!', StatusCodes.BAD_REQUEST)
    }

    const passwordHash = await BcryptUtil.hash(registerDto.password)

    const user = await AuthRepository.createUser({
      email: registerDto.email,
      passwordHash,
      fullName: registerDto.fullName,
      roleId: 3
    })

    const payload = { id: user.id, email: user.email, roleId: user.roleId }
    const accessToken = JwtUtil.generateAccessToken(payload)
    const refreshToken = JwtUtil.generateRefreshToken(payload)
    const tokenHash = JwtUtil.hashToken(refreshToken)
    await AuthRepository.saveRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    })

    return {
      user,
      accessToken,
      refreshToken
    }
  }

  static async login(loginDto: LoginDto) {
    const user = await AuthRepository.findByEmail(loginDto.email)
    if (!user) {
      throw new AppError('Email hoặc mật khẩu không chính xác', StatusCodes.UNAUTHORIZED)
    }

    const isPasswordValid = await BcryptUtil.compare(loginDto.password, user.passwordHash)
    if (!isPasswordValid) {
      throw new AppError('Email hoặc mật khẩu không chính xác', StatusCodes.UNAUTHORIZED)
    }

    if (user.status === 'pending_approve') {
      throw new AppError('Tài khoản chưa được phê duyệt!', StatusCodes.FORBIDDEN)
    }

    if (user.status === 'banned') {
      throw new AppError('Tài khoản đã bị khóa!', StatusCodes.FORBIDDEN)
    }

    const payload = { id: user.id, email: user.email, roleId: user.roleId }
    const accessToken = JwtUtil.generateAccessToken(payload)
    const refreshToken = JwtUtil.generateRefreshToken(payload)
    const tokenHash = JwtUtil.hashToken(refreshToken)
    await AuthRepository.saveRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    })

    return {
      user,
      accessToken,
      refreshToken
    }
  }

  static async refreshToken(oldRT: string) {
    let payload
    try {
      payload = JwtUtil.verifyRefreshToken(oldRT)
    } catch (error) {
      throw new AppError('Refresh token không hợp lệ', StatusCodes.UNAUTHORIZED)
    }

    const tokenHash = JwtUtil.hashToken(oldRT)
    const storedToken = await AuthRepository.getRefreshToken(tokenHash)
    if (!storedToken || storedToken.isRevoked) {
      throw new AppError('Refresh token đã bị thu hồi', StatusCodes.UNAUTHORIZED)
    }

    const user = await AuthRepository.findById(payload.id)
    if (!user) {
      throw new AppError('User không tồn tại', StatusCodes.NOT_FOUND)
    }

    const newPayload = { id: user.id, email: user.email, roleId: user.roleId }
    const newAT = JwtUtil.generateAccessToken(newPayload)
    const newRT = JwtUtil.generateRefreshToken(newPayload)

    await AuthRepository.revokeRefreshToken(tokenHash)
    const newTokenHash = JwtUtil.hashToken(newRT)
    await AuthRepository.saveRefreshToken({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    })

    return {
      user,
      accessToken: newAT,
      refreshToken: newRT
    }
  }

  static async logout(refreshToken: string) {
    const tokenHash = JwtUtil.hashToken(refreshToken)
    await AuthRepository.revokeRefreshToken(tokenHash)
    return { message: 'Logout thành công' }
  }

  static async logoutAllDevices(userId: number) {
    await AuthRepository.revokeAllRefreshTokens(userId)
    return { message: 'Logout tất cả thiết bị thành công' }
  }
}
