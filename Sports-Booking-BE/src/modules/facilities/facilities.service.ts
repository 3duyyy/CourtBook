import { StatusCodes } from 'http-status-codes'
import { CreateFacilityDto, CreateFieldDto, FacilityQueryDto, SetFieldPricesDto } from '../../dtos/facilities.dto'
import { AppError } from '../../shared/exceptions'
import { FacilitiesRepository } from './facilities.repository'

export class FacilitiesService {
  static async createFacility(ownerId: number, dto: CreateFacilityDto) {
    const facility = await FacilitiesRepository.createFacility(ownerId, dto)
    return facility
  }

  static async getMyFacilities(ownerId: number) {
    return FacilitiesRepository.findFacilitiesByOwner(ownerId)
  }

  static async createField(ownerId: number, facilityId: number, dto: CreateFieldDto) {
    const facility = await FacilitiesRepository.findFacilityById(facilityId)
    if (!facility) {
      throw new AppError('Cụm sân không tồn tại!', StatusCodes.NOT_FOUND)
    }

    if (facility.ownerId !== ownerId) {
      throw new AppError('Bạn không có quyền thêm sân vào cụm sân này!', StatusCodes.FORBIDDEN)
    }

    return await FacilitiesRepository.createField(facilityId, dto)
  }

  static async setFieldPrices(ownerId: number, fieldId: number, dto: SetFieldPricesDto) {
    const field = await FacilitiesRepository.findFieldById(fieldId)
    if (!field) {
      throw new AppError('Sân không tồn tại', StatusCodes.NOT_FOUND)
    }

    if (field.facility.ownerId !== ownerId) {
      throw new AppError('Bạn không có quyền cấu hình giá cho sân này', StatusCodes.FORBIDDEN)
    }

    await FacilitiesRepository.replaceFieldPricings(fieldId, dto.pricings)

    return await FacilitiesRepository.findPricingsByField(fieldId)
  }

  static async getPublicFacilities(query: FacilityQueryDto) {
    return await FacilitiesRepository.findPublicFacilities(query)
  }

  static async getPublicFacilityById(id: number) {
    const facility = await FacilitiesRepository.findPublicFacilityById(id)
    if (!facility) {
      throw new AppError('Cụm sân không tồn tại!', StatusCodes.NOT_FOUND)
    }

    const { reviews, ...rest } = facility
    return {
      ...rest,
      avgRating: reviews.length ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : null,
      reviewCount: reviews.length
    }
  }

  static async getFacilityReviews(facilityId: number, page: number, limit: number) {
    const facility = await FacilitiesRepository.findFacilityById(facilityId)
    if (!facility) throw new AppError('Cụm sân không tồn tại!', StatusCodes.NOT_FOUND)

    return await FacilitiesRepository.findReviewsByFacility(facilityId, page, limit)
  }

  static async getFacilityAvailability(facilityId: number, dateStr: string) {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      throw new AppError('Định dạng ngày không hợp lệ (YYYY-MM-DD)', StatusCodes.BAD_REQUEST)
    }

    const facility = await FacilitiesRepository.findFacilityById(facilityId)
    if (!facility) {
      throw new AppError('Cụm sân không tồn tại!', StatusCodes.NOT_FOUND)
    }

    const fields = await FacilitiesRepository.findFieldsWithBookingsByDate(facilityId, date)
    const isWeekend = [0, 6].includes(date.getDay())

    return fields.map((field) => {
      const pricings = field.fieldPricings.filter((p) => p.isWeekend === isWeekend)
      const slots = pricings.map((pricing) => {
        const isBooked = field.bookings.some(
          (b) =>
            b.startTime.getHours() * 60 + b.startTime.getMinutes() <
              parseInt(pricing.endTime.split(':')[0]!) * 60 + parseInt(pricing.endTime.split(':')[1]!) &&
            b.endTime.getHours() * 60 + b.endTime.getMinutes() >
              parseInt(pricing.startTime.split(':')[0]!) * 60 + parseInt(pricing.startTime.split(':')[1]!)
        )
        return {
          startTime: pricing.startTime,
          endTime: pricing.endTime,
          pricePerHour: pricing.pricePerHour,
          status: isBooked ? 'booked' : 'available'
        }
      })
      return {
        id: field.id,
        name: field.name,
        slots
      }
    })
  }
}
