import { NextFunction, Request, Response } from 'express'
import { FacilitiesService } from './facilities.service'
import { StatusCodes } from 'http-status-codes'
import { AppError } from '../../shared/exceptions'

export class FacilitiesController {
  static async createFacility(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const facility = await FacilitiesService.createFacility(ownerId, req.body)

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: facility,
        message: 'Tạo cụm sân mới thành công!'
      })
    } catch (error) {
      next(error)
    }
  }

  static async getMyFacilities(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const facilities = await FacilitiesService.getMyFacilities(ownerId)

      res.status(StatusCodes.OK).json({
        success: true,
        data: facilities,
        message: 'Lấy danh sách cụm sân thành công'
      })
    } catch (error) {
      next(error)
    }
  }

  static async createField(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const facilityId = parseInt(req.params.facilityId as string)
      const field = await FacilitiesService.createField(ownerId, facilityId, req.body)

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: field,
        message: 'Thêm sân mới thành công!'
      })
    } catch (error) {
      next(error)
    }
  }

  static async setFieldPrices(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const fieldId = parseInt(req.params.fieldId as string)
      const pricings = await FacilitiesService.setFieldPrices(ownerId, fieldId, req.body)

      res.status(StatusCodes.OK).json({
        success: true,
        data: pricings,
        message: 'Cấu hình giá thành công!'
      })
    } catch (error) {
      next(error)
    }
  }

  static async getPublicFacilities(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await FacilitiesService.getPublicFacilities(req.query)

      res.status(StatusCodes.OK).json({
        success: true,
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  static async getPublicFacilityById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await FacilitiesService.getPublicFacilityById(parseInt(req.params.id as string))

      res.status(StatusCodes.OK).json({
        success: true,
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  static async getFacilityReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10 } = req.query
      const result = await FacilitiesService.getFacilityReviews(parseInt(req.params.id as string), Number(page), Number(limit))

      res.status(StatusCodes.OK).json({
        success: true,
        ...result
      })
    } catch (error) {
      next(error)
    }
  }

  static async getFacilityAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { date } = req.query
      if (!date) {
        throw new AppError('Thiếu query params!', StatusCodes.BAD_REQUEST)
      }

      const slots = await FacilitiesService.getFacilityAvailability(parseInt(req.params.id as string), date as string)

      res.status(StatusCodes.OK).json({ success: true, data: slots })
    } catch (error) {
      next(error)
    }
  }
}
