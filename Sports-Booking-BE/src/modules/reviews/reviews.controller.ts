import { NextFunction, Request, Response } from 'express'
import { ReviewsService } from './reviews.service'
import { StatusCodes } from 'http-status-codes'

export class ReviewsController {
  static async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const review = await ReviewsService.createReview(userId, req.body)

      res.status(StatusCodes.CREATED).json({ success: true, data: review })
    } catch (error) {
      next(error)
    }
  }

  static async checkCanReview(req: Request, res: Response, next: NextFunction) {
    const userId = req.user!.id
    const facilityId = Number(req.query.facilityId)
    if (!facilityId) {
      res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'facilityId is required' })
      return
    }

    const result = await ReviewsService.checkCanReview(userId, facilityId)

    res.status(StatusCodes.OK).json({ success: true, data: result })
  }

  static async getOwnerReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const facilityId = Number(req.query.facilityId)
      const page = Number(req.query.page) || 1
      const limit = Number(req.query.limit) || 10
      const result = await ReviewsService.getOwnerFacilityReviews(ownerId, facilityId, page, limit)
      res.status(StatusCodes.OK).json({ success: true, ...result })
    } catch (error) {
      next(error)
    }
  }

  static async ownerReplyReview(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const reviewId = Number(req.params.reviewId)
      const review = await ReviewsService.ownerReplyReview(ownerId, reviewId, req.body.reply)
      res.status(StatusCodes.OK).json({ success: true, data: review })
    } catch (error) {
      next(error)
    }
  }

  static async deleteOwnReview(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const reviewId = Number(req.params.reviewId)

      await ReviewsService.deleteOwnReview(userId, reviewId)

      res.status(StatusCodes.OK).json({ success: true, message: 'Đã xóa đánh giá' })
    } catch (error) {
      next(error)
    }
  }

  static async ownerDeleteReview(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const reviewId = Number(req.params.reviewId)

      await ReviewsService.ownerDeleteReview(ownerId, reviewId)

      res.status(StatusCodes.OK).json({ success: true, message: 'Đã xóa đánh giá' })
    } catch (error) {
      next(error)
    }
  }

  static async deleteOwnerReplyReview(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const reviewId = Number(req.params.reviewId)

      await ReviewsService.deleteOwnerReplyReview(ownerId, reviewId)

      res.status(StatusCodes.OK).json({ success: true, message: 'Đã xóa phản hồi' })
    } catch (error) {
      next(error)
    }
  }
}
