import { RefreshToken, User } from '@prisma/client'
import { prisma } from '../../shared/prisma/client'

export class AuthRepository {
  static async createUser(data: {
    email: string
    passwordHash: string
    fullName: string
    phone?: string
    roleId: number
  }): Promise<User> {
    return prisma.user.create({ data, include: { role: true } })
  }

  static async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
      include: { role: true }
    })
  }

  static async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true }
    })
  }

  static async saveRefreshToken(data: {
    userId: number
    tokenHash: string
    deviceInfo?: string
    ipAddress?: string
    expiresAt: Date
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data })
  }

  static async getRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } })
  }

  static async revokeRefreshToken(tokenHash: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { tokenHash },
      data: { isRevoked: true }
    })
  }

  static async revokeAllRefreshTokens(userId: number): Promise<any> {
    return prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true }
    })
  }

  static async deleteExpiredTokens(): Promise<any> {
    return prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    })
  }
}
