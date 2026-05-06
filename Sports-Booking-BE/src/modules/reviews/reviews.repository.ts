import { prisma } from '../../shared/prisma/client'

export class ReviewsRepository {
  static async findBookingWithFacility(bookingId: number) {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        field: {
          select: {
            facilityId: true,
            facility: { select: { id: true, ownerId: true } }
          }
        }
      }
    })
  }

  static async findByBookingId(bookingId: number) {
    return prisma.review.findUnique({ where: { bookingId } })
  }

  static async createReview(data: { bookingId: number; userId: number; facilityId: number; rating: number; comment?: string }) {
    return prisma.review.create({ data })
  }

  // Customer check có booking completed/confirmed ở facility không
  static async hasCompletedBooking(userId: number, facilityId: number) {
    const booking = await prisma.booking.findFirst({
      where: {
        userId,
        field: { facilityId },
        status: { in: ['completed', 'confirmed'] }
      }
    })

    return !!booking
  }

  // Customer lấy danh sách booking có thể review (mà chưa review)
  static async getReviewableBookings(userId: number, facilityId: number) {
    return prisma.booking.findMany({
      where: {
        userId,
        field: { facilityId },
        status: { in: ['completed', 'confirmed'] },
        review: null
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        field: { select: { name: true } }
      },
      orderBy: { startTime: 'desc' }
    })
  }

  // Owner lấy reviews theo facilityId
  static async findByFacilityId(facilityId: number, page = 1, limit = 10) {
    const skip = (page - 1) * limit

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { facilityId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true } },
          booking: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              field: { select: { name: true } }
            }
          }
        }
      }),

      prisma.review.count({ where: { facilityId } })
    ])

    return {
      data: reviews,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
    }
  }

  // Owner reply review của customer
  static async ownerReply(reviewId: number, reply: string) {
    return prisma.review.update({
      where: { id: reviewId },
      data: { ownerReply: reply, ownerReplyAt: new Date() }
    })
  }

  // Check review thuộc facility và ownerId nào
  static async findReviewWithFacilityOwner(reviewId: number) {
    return prisma.review.findUnique({
      where: { id: reviewId },
      include: { facility: { select: { ownerId: true } } }
    })
  }

  // Customer xóa review
  static async deleteReview(reviewId: number) {
    return prisma.review.delete({ where: { id: reviewId } })
  }

  // Tìm review by id để check userid
  static async findById(reviewId: number) {
    return prisma.review.findUnique({
      where: { id: reviewId },
      include: { facility: { select: { ownerId: true } } }
    })
  }

  static async deleteOwnerReply(reviewId: number) {
    return prisma.review.update({
      where: { id: reviewId },
      data: { ownerReply: null, ownerReplyAt: null }
    })
  }
}
