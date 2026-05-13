import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { BookingsService } from './bookings.service'

export class BookingsController {
  static async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id
      const result = await BookingsService.createBooking(userId, req.body)

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: result,
        message: 'Booking tạo thành công. Vui lòng thanh toán.'
      })
    } catch (error) {
      next(error)
    }
  }
}
