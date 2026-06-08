import { Prisma, User } from '../../../generated/prisma'
import { ROLES } from '../../shared/constants/roles'
import { AppError } from '../../shared/exceptions'
import { prisma } from '../../shared/prisma/client'
import { toPagination } from '../../shared/utils/utils'

export class UsersRepository {
  private static buildMyBookingsWhere(params: {
    userId: number
    tab: 'all' | 'pending_confirmation' | 'upcoming' | 'completed' | 'cancelled'
    now: Date
  }): Prisma.BookingWhereInput {
    const baseWhere: Prisma.BookingWhereInput = { userId: params.userId }

    if (params.tab === 'pending_confirmation') {
      return { ...baseWhere, status: 'pending' }
    }

    if (params.tab === 'upcoming') {
      return {
        ...baseWhere,
        status: 'confirmed',
        startTime: { gt: params.now }
      }
    }

    if (params.tab === 'completed') {
      return {
        ...baseWhere,
        OR: [{ status: 'completed' }, { status: 'confirmed', endTime: { lte: params.now } }]
      }
    }

    if (params.tab === 'cancelled') {
      return {
        ...baseWhere,
        status: { in: ['cancelled', 'rejected'] }
      }
    }

    return baseWhere
  }

  static async getProfile(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        bankName: true,
        bankAccount: true,
        accountHolder: true,
        role: {
          select: { name: true }
        }
      }
    })
  }

  static async createUser(data: {
    email: string
    passwordHash: string
    fullName: string
    phone?: string
    roleId: number
  }): Promise<User> {
    return prisma.user.create({ data: { ...data, isVerified: true }, include: { role: true } })
  }

  static async findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        status: true,
        isVerified: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
            rolePermissions: {
              select: { permission: { select: { slug: true } } }
            }
          }
        }
      }
    })
  }

  static async updateProfile(userId: number, data: any) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        accountHolder: data.accountHolder
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        bankName: true,
        bankAccount: true,
        accountHolder: true
      }
    })
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } }
    })
  }

  static async findByIdWithPassword(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, passwordHash: true }
    })
  }

  static async updatePassword(id: number, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash }
    })
  }

  static async upgradeToOwner(id: number) {
    return prisma.user.update({
      where: { id },
      data: { roleId: ROLES.OWNER }
    })
  }

  static async updateStatus(id: number, status: 'active' | 'banned' | 'pending_approve') {
    return prisma.user.update({
      where: { id },
      data: { status }
    })
  }

  static async verifyEmail(id: number) {
    return prisma.user.update({ where: { id }, data: { isVerified: true } })
  }

  static async findMyBookings(params: {
    userId: number
    page: number
    limit: number
    tab: 'all' | 'pending_confirmation' | 'upcoming' | 'completed' | 'cancelled'
    now: Date
  }) {
    const skip = (params.page - 1) * params.limit
    const where = this.buildMyBookingsWhere({
      userId: params.userId,
      tab: params.tab,
      now: params.now
    })

    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: [{ startTime: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          totalPrice: true,
          depositAmount: true,
          checkInCode: true,
          rejectionReason: true,
          startTime: true,
          endTime: true,
          updatedAt: true,
          field: {
            select: {
              name: true,
              facility: {
                select: {
                  name: true,
                  address: true,
                  district: true,
                  city: true,
                  sport: { select: { name: true } },
                  facilityImages: {
                    where: { isThumbnail: true },
                    take: 1,
                    orderBy: { id: 'asc' },
                    select: { imageUrl: true }
                  }
                }
              }
            }
          },
          transactions: {
            where: { type: 'payment', status: { in: ['success', 'pending'] } },
            select: { amount: true }
          }
        }
      }),
      prisma.booking.count({ where })
    ])

    return {
      data,
      pagination: toPagination(params.page, params.limit, total)
    }
  }

  static async countMyBookingsByTab(userId: number, now: Date) {
    const [pendingConfirmation, upcoming, completed, cancelled] = await Promise.all([
      prisma.booking.count({
        where: {
          userId,
          status: 'pending'
        }
      }),
      prisma.booking.count({
        where: {
          userId,
          status: 'confirmed',
          startTime: { gt: now }
        }
      }),
      prisma.booking.count({
        where: {
          userId,
          OR: [{ status: 'completed' }, { status: 'confirmed', endTime: { lte: now } }]
        }
      }),
      prisma.booking.count({
        where: {
          userId,
          status: { in: ['cancelled', 'rejected'] }
        }
      })
    ])

    return {
      pending_confirmation: pendingConfirmation,
      upcoming,
      completed,
      cancelled
    }
  }

  static async findMyBookingForCancel(userId: number, bookingId: number) {
    return prisma.booking.findFirst({
      where: { id: bookingId, userId },
      select: {
        id: true,
        status: true,
        startTime: true
      }
    })
  }

  static async cancelMyBooking(userId: number, bookingId: number, lockThreshold: Date, reason?: string) {
    // tx: bản draft prisma
    return prisma.$transaction(async (tx) => {
      const updated = await tx.booking.updateMany({
        where: {
          id: bookingId,
          userId,
          status: { in: ['pending', 'confirmed'] },
          startTime: { gt: lockThreshold }
        },
        data: {
          status: 'cancelled',
          ...(reason ? { note: reason } : {})
        }
      })

      if (updated.count === 0) return null

      // Chuyển transaction pending → failed (không cần admin duyệt nữa)
      // await tx.transaction.updateMany({
      //   where: {
      //     bookingId,
      //     type: 'payment',
      //     status: 'pending'
      //   },
      //   data: {
      //     status: 'failed',
      //     description: 'Tự động hủy do khách hàng hủy booking'
      //   }
      // })

      // Tính tiền đã thanh toán thành công → tạo RefundRequest nếu > 0
      const paidAgg = await tx.transaction.aggregate({
        _sum: { amount: true },
        where: {
          bookingId,
          type: 'payment',
          status: 'success'
        }
      })

      const paidAmount = Number(paidAgg._sum.amount ?? 0)

      if (paidAmount > 0) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { bankName: true, bankAccount: true, accountHolder: true }
        })

        if (!user?.bankName || !user?.bankAccount || !user?.accountHolder) {
          throw new AppError('Người dùng chưa cập nhật đầy đủ thông tin ngân hàng', 400)
        }

        await tx.refundRequest.create({
          data: {
            bookingId,
            userId,
            amount: paidAmount,
            status: 'pending',
            bankName: user.bankName,
            bankAccount: user.bankAccount,
            accountHolder: user.accountHolder
          }
        })

        await tx.booking.update({
          where: { id: bookingId },
          data: { paymentStatus: 'refunded' }
        })
      }

      return tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          status: true,
          updatedAt: true
        }
      })
    })
  }

  static async saveOtp(userId: number, otpCode: string, otpExpiresAt: Date) {
    return prisma.user.update({
      where: { id: userId },
      data: { otpCode, otpExpiresAt }
    })
  }

  static async clearOtpAndResetPassword(userId: number, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        otpCode: null,
        otpExpiresAt: null
      }
    })
  }
}
