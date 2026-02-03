import { User } from '@prisma/client'
import { prisma } from '../../shared/prisma/client'

export class AuthRepository {
  static async createUser(data: {
    email: string
    passwordHash: string
    fullName: string
    phone?: string
    roleId: number
  }): Promise<User> {
    return prisma.user.create({ data })
  }
}
