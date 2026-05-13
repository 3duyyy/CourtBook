import { NextFunction, Request, Response } from 'express'
import { FacilitiesService } from './facilities.service'
import { StatusCodes } from 'http-status-codes'
import { AppError } from '../../shared/exceptions'
import { getQueryString } from '../../shared/utils/utils'

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

      const pageRaw = getQueryString(req.query.page)
      const limitRaw = getQueryString(req.query.limit)
      const keywordRaw = getQueryString(req.query.keyword)
      const statusRaw = getQueryString(req.query.status)

      const page = pageRaw ? Number(pageRaw) : 1
      const limit = limitRaw ? Number(limitRaw) : 5
      const keyword = (keywordRaw ?? '').trim()

      if (!Number.isInteger(page) || page <= 0) {
        throw new AppError('page phải là số nguyên dương', StatusCodes.BAD_REQUEST)
      }

      if (!Number.isInteger(limit) || limit <= 0 || limit > 20) {
        throw new AppError('limit phải là số nguyên trong khoảng 1-20', StatusCodes.BAD_REQUEST)
      }

      if (keyword.length > 100) {
        throw new AppError('keyword tối đa 100 ký tự', StatusCodes.BAD_REQUEST)
      }

      let status: 'pending_approve' | 'active' | 'inactive' | undefined
      if (statusRaw) {
        if (!['pending_approve', 'active', 'inactive'].includes(statusRaw)) {
          throw new AppError('status không hợp lệ', StatusCodes.BAD_REQUEST)
        }
        status = statusRaw as 'pending_approve' | 'active' | 'inactive'
      }

      const result = await FacilitiesService.getMyFacilities({
        ownerId,
        page,
        limit,
        ...(keyword ? { keyword } : {}),
        ...(status ? { status } : {})
      })

      res.status(StatusCodes.OK).json({
        success: true,
        data: result.data,
        pagination: result.pagination
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

  static async getOwnerOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id

      const date = getQueryString(req.query.date)
      const recentPageRaw = getQueryString(req.query.recentPage)
      const recentLimitRaw = getQueryString(req.query.recentLimit)
      const scheduleLimitRaw = getQueryString(req.query.scheduleLimit)

      const recentPage = recentPageRaw ? Number(recentPageRaw) : 1
      const recentLimit = recentLimitRaw ? Number(recentLimitRaw) : 5
      const scheduleLimit = scheduleLimitRaw ? Number(scheduleLimitRaw) : 8

      if (!Number.isInteger(recentPage) || recentPage <= 0) {
        throw new AppError('recentPage phải là số nguyên dương', StatusCodes.BAD_REQUEST)
      }

      if (!Number.isInteger(recentLimit) || recentLimit <= 0 || recentLimit > 20) {
        throw new AppError('recentLimit phải là số nguyên trong khoảng 1-20', StatusCodes.BAD_REQUEST)
      }

      if (!Number.isInteger(scheduleLimit) || scheduleLimit <= 0 || scheduleLimit > 100) {
        throw new AppError('scheduleLimit phải là số nguyên trong khoảng 1-100', StatusCodes.BAD_REQUEST)
      }

      if (date) {
        const ok = /^\d{4}-\d{2}-\d{2}$/.test(date)
        if (!ok) {
          throw new AppError('date phải theo định dạng YYYY-MM-DD', StatusCodes.BAD_REQUEST)
        }
      }

      const data = await FacilitiesService.getOwnerOverview(ownerId, {
        ...(date ? { date } : {}),
        recentPage,
        recentLimit,
        scheduleLimit
      })

      res.status(StatusCodes.OK).json({
        success: true,
        data
      })
    } catch (error) {
      next(error)
    }
  }

  static async getOwnerCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const fromRaw = getQueryString(req.query.from)
      const toRaw = getQueryString(req.query.to)

      const now = new Date()
      const defaultFrom = new Date(now)
      defaultFrom.setHours(0, 0, 0, 0)
      const defaultTo = new Date(defaultFrom)
      defaultTo.setDate(defaultTo.getDate() + 7)

      const from = fromRaw ? new Date(fromRaw) : defaultFrom
      const to = toRaw ? new Date(toRaw) : defaultTo

      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new AppError('from/to không hợp lệ', StatusCodes.BAD_REQUEST)
      }

      if (from >= to) {
        throw new AppError('from phải nhỏ hơn to', StatusCodes.BAD_REQUEST)
      }

      const diffDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
      if (diffDays > 93) {
        throw new AppError('Khoảng thời gian tối đa 93 ngày', StatusCodes.BAD_REQUEST)
      }

      const data = await FacilitiesService.getOwnerCalendar(ownerId, { from, to })

      res.status(StatusCodes.OK).json({
        success: true,
        data
      })
    } catch (error) {
      next(error)
    }
  }

  static async searchOwnerCheckInBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const keyword = (getQueryString(req.query.keyword) ?? '').trim()

      if (!keyword) {
        return res.status(StatusCodes.OK).json({
          success: true,
          data: null
        })
      }

      if (keyword.length > 100) {
        throw new AppError('keyword tối đa 100 ký tự', StatusCodes.BAD_REQUEST)
      }

      const data = await FacilitiesService.searchOwnerCheckInBooking(ownerId, keyword)

      res.status(StatusCodes.OK).json({
        success: true,
        data
      })
    } catch (error) {
      next(error)
    }
  }

  static async getOwnerCheckInHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const pageRaw = getQueryString(req.query.page)
      const limitRaw = getQueryString(req.query.limit)
      const date = getQueryString(req.query.date)

      const page = pageRaw ? Number(pageRaw) : 1
      const limit = limitRaw ? Number(limitRaw) : 20

      if (!Number.isInteger(page) || page <= 0) {
        throw new AppError('page phải là số nguyên dương', StatusCodes.BAD_REQUEST)
      }

      if (!Number.isInteger(limit) || limit <= 0 || limit > 50) {
        throw new AppError('limit phải là số nguyên trong khoảng 1-50', StatusCodes.BAD_REQUEST)
      }

      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new AppError('date phải theo định dạng YYYY-MM-DD', StatusCodes.BAD_REQUEST)
      }

      const result = await FacilitiesService.getOwnerCheckInHistory(ownerId, {
        page,
        limit,
        ...(date ? { date } : {})
      })

      res.status(StatusCodes.OK).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      })
    } catch (error) {
      next(error)
    }
  }

  static async completeOwnerCheckIn(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const bookingId = Number(req.params.bookingId)
      const collectedRemaining = Boolean(req.body?.collectedRemaining)

      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        throw new AppError('bookingId không hợp lệ', StatusCodes.BAD_REQUEST)
      }

      const data = await FacilitiesService.completeOwnerCheckIn(ownerId, bookingId, collectedRemaining)

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        message: 'Check-in thành công'
      })
    } catch (error) {
      next(error)
    }
  }

  static async getOwnerFacilityDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const facilityId = Number(req.params.facilityId)

      if (!Number.isInteger(facilityId) || facilityId <= 0) {
        throw new AppError('facilityId không hợp lệ', StatusCodes.BAD_REQUEST)
      }

      const data = await FacilitiesService.getOwnerFacilityDetail(ownerId, facilityId)

      res.status(StatusCodes.OK).json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }

  static async updateOwnerFacility(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const facilityId = Number(req.params.facilityId)

      if (!Number.isInteger(facilityId) || facilityId <= 0) {
        throw new AppError('facilityId không hợp lệ', StatusCodes.BAD_REQUEST)
      }

      const data = await FacilitiesService.updateOwnerFacility(ownerId, facilityId, req.body)

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        message: 'Cập nhật cụm sân thành công!'
      })
    } catch (error) {
      next(error)
    }
  }

  static async deleteOwnerFacility(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const facilityId = Number(req.params.facilityId)

      if (!Number.isInteger(facilityId) || facilityId <= 0) {
        throw new AppError('facilityId không hợp lệ', StatusCodes.BAD_REQUEST)
      }

      await FacilitiesService.deleteOwnerFacility(ownerId, facilityId)

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Xóa cụm sân thành công!'
      })
    } catch (error) {
      next(error)
    }
  }

  static async updateField(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const fieldId = Number(req.params.fieldId)

      if (!Number.isInteger(fieldId) || fieldId <= 0) {
        throw new AppError('fieldId không hợp lệ', StatusCodes.BAD_REQUEST)
      }

      const data = await FacilitiesService.updateField(ownerId, fieldId, req.body)

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        message: 'Cập nhật sân thành công!'
      })
    } catch (error) {
      next(error)
    }
  }

  static async deleteField(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const fieldId = Number(req.params.fieldId)

      if (!Number.isInteger(fieldId) || fieldId <= 0) {
        throw new AppError('fieldId không hợp lệ', StatusCodes.BAD_REQUEST)
      }

      await FacilitiesService.deleteField(ownerId, fieldId)

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Xóa sân thành công!'
      })
    } catch (error) {
      next(error)
    }
  }

  static async getFieldPrices(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id
      const fieldId = Number(req.params.fieldId)

      if (!Number.isInteger(fieldId) || fieldId <= 0) {
        throw new AppError('fieldId không hợp lệ', StatusCodes.BAD_REQUEST)
      }

      const data = await FacilitiesService.getFieldPrices(ownerId, fieldId)

      res.status(StatusCodes.OK).json({
        success: true,
        data
      })
    } catch (error) {
      next(error)
    }
  }

  // =====================Public route========================
  static async getFeaturedFacilities(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await FacilitiesService.getFeaturedFacilities()

      res.status(StatusCodes.OK).json({
        success: true,
        data: result
      })
    } catch (error) {
      next(error)
    }
  }

  static async getPublicFacilities(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, city, sort, page, limit, minPrice, maxPrice } = req.query

      const districts = req.query.districts
        ? Array.isArray(req.query.districts)
          ? req.query.districts.map(String)
          : [String(req.query.districts)]
        : undefined

      const sportIds = req.query.sportIds
        ? (Array.isArray(req.query.sportIds) ? req.query.sportIds : [req.query.sportIds]).map(Number).filter((n) => !isNaN(n))
        : undefined

      const utilityIds = req.query.utilityIds
        ? (Array.isArray(req.query.utilityIds) ? req.query.utilityIds : [req.query.utilityIds]).map(Number).filter((n) => !isNaN(n))
        : undefined

      const parsedParams = {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        ...(q ? { q: String(q) } : {}),
        ...(city ? { city: String(city) } : {}),
        ...(sort && ['newest', 'rating', 'price_asc', 'price_desc'].includes(String(sort)) ? { sort: String(sort) } : {}),
        ...(minPrice ? { minPrice: Number(minPrice) } : {}),
        ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
        ...(districts && districts.length > 0 ? { districts } : {}),
        ...(sportIds && sportIds.length > 0 ? { sportIds } : {}),
        ...(utilityIds && utilityIds.length > 0 ? { utilityIds } : {})
      }

      const result = await FacilitiesService.getPublicFacilities(parsedParams)

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

  static async ownerRejectBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user.id
      const bookingId = Number(req.params.bookingId)
      const { reason } = req.body

      if (!reason || !reason.trim()) {
        throw new AppError('Vui lòng nhập lý do từ chối', StatusCodes.BAD_REQUEST)
      }

      await FacilitiesService.ownerRejectBooking(ownerId, bookingId, reason)
      res.status(StatusCodes.OK).json({ success: true, message: 'Đã từ chối booking' })
    } catch (error) {
      next(error)
    }
  }
}
