import { StatusCodes } from 'http-status-codes'
import { CreateReviewDto } from '../../dtos/reviews.dto'
import { AppError } from '../../shared/exceptions'
import { ReviewsRepository } from './reviews.repository'
import { prisma } from '../../shared/prisma/client'

export class ReviewsService {
  static async createReview(userId: number, dto: CreateReviewDto) {
    const booking = await ReviewsRepository.findBookingWithFacility(dto.bookingId)
    if (!booking) throw new AppError('Booking không tồn tại', StatusCodes.NOT_FOUND)
    if (booking.userId !== userId) throw new AppError('Bạn không có quyền đánh giá booking này', StatusCodes.FORBIDDEN)
    if (!['completed', 'confirmed'].includes(booking.status)) {
      throw new AppError('Chỉ có thể đánh giá booking đã hoàn thành hoặc đã xác nhận', StatusCodes.BAD_REQUEST)
    }

    const existing = await ReviewsRepository.findByBookingId(dto.bookingId)
    if (existing) throw new AppError('Bạn đã đánh giá booking này rồi', StatusCodes.CONFLICT)

    return ReviewsRepository.createReview({
      ...dto,
      userId,
      facilityId: booking.field.facilityId
    })
  }

  static async checkCanReview(userId: number, facilityId: number) {
    const canReview = await ReviewsRepository.hasCompletedBooking(userId, facilityId)

    const reviewableBookings = canReview ? await ReviewsRepository.getReviewableBookings(userId, facilityId) : []

    return { canReview: canReview && reviewableBookings.length > 0, reviewableBookings }
  }

  static async getOwnerFacilityReviews(ownerId: number, facilityId: number, page: number, limit: number) {
    const facility = await prisma.facility.findFirst({ where: { id: facilityId, ownerId } })
    if (!facility) throw new AppError('Không tìm thấy sân hoặc sân không thuộc về bạn', StatusCodes.NOT_FOUND)

    return ReviewsRepository.findByFacilityId(facilityId, page, limit)
  }

  static async ownerReplyReview(ownerId: number, reviewId: number, reply: string) {
    const review = await ReviewsRepository.findReviewWithFacilityOwner(reviewId)
    if (!review) throw new AppError('Không tìm thấy đánh giá', StatusCodes.NOT_FOUND)
    if (review.facility.ownerId !== ownerId) {
      throw new AppError('Bạn không có quyền phản hồi đánh giá này', StatusCodes.FORBIDDEN)
    }

    return ReviewsRepository.ownerReply(reviewId, reply)
  }

  static async deleteOwnReview(userId: number, reviewId: number) {
    const review = await ReviewsRepository.findById(reviewId)
    if (!review) throw new AppError('Không tìm thấy đánh giá', StatusCodes.NOT_FOUND)
    if (review.userId !== userId) throw new AppError('Bạn không có quyền xóa đánh giá này', StatusCodes.FORBIDDEN)

    return ReviewsRepository.deleteReview(reviewId)
  }

  static async ownerDeleteReview(ownerId: number, reviewId: number) {
    const review = await ReviewsRepository.findById(reviewId)
    if (!review) throw new AppError('Không tìm thấy đánh giá', StatusCodes.NOT_FOUND)
    if (review.facility.ownerId !== ownerId) throw new AppError('Bạn không có quyền xóa đánh giá này', StatusCodes.FORBIDDEN)

    return ReviewsRepository.deleteReview(reviewId)
  }

  static async deleteOwnerReplyReview(ownerId: number, reviewId: number) {
    const review = await ReviewsRepository.findReviewWithFacilityOwner(reviewId)
    if (!review) throw new AppError('Không tìm thấy đánh giá', StatusCodes.NOT_FOUND)
    if (review.facility.ownerId !== ownerId) {
      throw new AppError('Bạn không có quyền thao tác trên đánh giá này', StatusCodes.FORBIDDEN)
    }

    return ReviewsRepository.deleteOwnerReply(reviewId)
  }
}
