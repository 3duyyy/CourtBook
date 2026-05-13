import { NextFunction, Request, Response } from 'express'
import { PaymentsService } from './payments.service'
import { StatusCodes } from 'http-status-codes'
import { AppError } from '../../shared/exceptions'

export class PaymentsController {
  static async payosWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      await PaymentsService.handlePayosWebhook(req.body)
      res.status(StatusCodes.OK).json({ success: true })
    } catch (error) {
      next(error)
    }
  }

  static async getPaymentResult(req: Request, res: Response, next: NextFunction) {
    try {
      const orderCode = Number(req.query.orderCode)
      if (!orderCode) {
        throw new AppError('OrderCode is required', StatusCodes.BAD_REQUEST)
      }

      const result = await PaymentsService.getPaymentResult(orderCode)
      res.status(StatusCodes.OK).json({
        success: true,
        data: result
      })
    } catch (error) {
      next(error)

      // console.error('PayOS webhook error:', error)
      // // Luôn trả 200 để PayOS không retry liên tục
      // res.status(StatusCodes.OK).json({ success: false })
    }
  }

  static async cancelPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const orderCode = Number(req.body.orderCode)
      if (!orderCode) {
        throw new AppError('OrderCode is required', StatusCodes.BAD_REQUEST)
      }

      const result = await PaymentsService.cancelPayment(orderCode)
      res.status(StatusCodes.OK).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
}
