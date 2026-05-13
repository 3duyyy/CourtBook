import { StatusCodes } from 'http-status-codes'
import {
  CreateFacilityDto,
  CreateFieldDto,
  FacilityQueryDto,
  SetFieldPricesDto,
  UpdateFacilityDto,
  UpdateFieldDto
} from '../../dtos/facilities.dto'
import { AppError } from '../../shared/exceptions'
import { FacilitiesRepository } from './facilities.repository'
import { UsersRepository } from '../users/users.repository'
import { ROLES } from '../../shared/constants/roles'
import { formatDateDDMMYYYY, formatHHmm, timeToMinutes } from '../../shared/utils/format'
import { OwnerFacilitiesListParams } from '../../shared/types/owner'
import { formatBookingCode } from '../../shared/utils/utils'
import { prisma } from '../../shared/prisma/client'

type AvailabilitySlot = {
  startTime: string
  endTime: string
  pricePerHour: string
  status: 'available' | 'booked'
}

type OwnerOverviewStatKey = 'todayBookings' | 'monthlyRevenue' | 'newCustomers' | 'completedBookings'
type OwnerOverviewStatItem = {
  key: OwnerOverviewStatKey
  value: number
  changePercent: number | null
}

type OwnerOverviewParams = {
  date?: string
  recentPage: number
  recentLimit: number
  scheduleLimit: number
}

type OwnerRecentBookingRow = {
  id: number
  startTime: Date
  endTime: Date
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'
  user: { fullName: string }
  field: { name: string; facility: { sport: { name: string } } }
}

type OwnerTodayScheduleRow = {
  id: number
  startTime: Date
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'
  paymentStatus: 'unpaid' | 'paid' | 'refunded' | 'partially_paid'
  user: { fullName: string }
  field: { name: string }
}

type OwnerCalendarParams = {
  from: Date
  to: Date
}

type OwnerCalendarBookingRow = {
  id: number
  startTime: Date
  endTime: Date
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'
  user: { fullName: string }
  field: { name: string; facility: { id: number; name: string } }
}

type OwnerCalendarMaintenanceFieldRow = {
  id: number
  name: string
  facility: {
    id: number
    name: string
    openTime: string | null
    closeTime: string | null
  }
}

export class FacilitiesService {
  // Common Internal Function
  private static minutesToTime(totalMinutes: number) {
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  private static buildHourlySlots(
    pricings: Array<{
      startTime: string
      endTime: string
      pricePerHour: any
    }>,
    bookings: Array<{
      startTime: Date
      endTime: Date
    }>
  ): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = []

    for (const pricing of pricings) {
      const start = timeToMinutes(pricing.startTime)
      const end = timeToMinutes(pricing.endTime)

      for (let cursor = start; cursor < end; cursor += 60) {
        const slotStart = cursor
        const slotEnd = cursor + 60

        if (slotEnd > end) break

        const isBooked = bookings.some((booking) => {
          const bookingStart = booking.startTime.getHours() * 60 + booking.endTime.getMinutes()
          const bookingEnd = booking.endTime.getHours() * 60 + booking.endTime.getMinutes()

          return bookingStart < slotEnd && bookingEnd > slotStart
        })

        slots.push({
          startTime: this.minutesToTime(slotStart),
          endTime: this.minutesToTime(slotEnd),
          pricePerHour: String(pricing.pricePerHour),
          status: isBooked ? 'booked' : 'available'
        })
      }
    }

    return slots
  }

  private static calculateChangePercent(current: number, previous: number): number | null {
    if (previous === 0) {
      if (current === 0) return 0
      return null
    }

    const percent = ((current - previous) / previous) * 100
    return Number(percent.toFixed(1))
  }

  private static resolveDayRange(date?: string) {
    let base: Date

    if (date) {
      const [year, month, day] = date.split('-').map(Number)
      base = new Date(year!, month! - 1, day)
    } else {
      base = new Date()
    }

    if (Number.isNaN(base.getTime())) {
      throw new AppError('Ngày không hợp lệ', StatusCodes.BAD_REQUEST)
    }

    const start = new Date(base)
    start.setHours(0, 0, 0, 0)

    const end = new Date(base)
    end.setHours(23, 59, 59, 999)

    return { start, end }
  }

  private static mapRecentStatus(status: OwnerRecentBookingRow['status']) {
    if (status === 'completed') return 'completed' as const
    if (status === 'confirmed') return 'confirmed' as const
    if (status === 'pending') return 'pending' as const
    return 'cancelled' as const
  }

  private static mapScheduleStatus(status: OwnerTodayScheduleRow['status']) {
    if (status === 'confirmed' || status === 'completed') return 'success' as const
    if (status === 'pending') return 'warning' as const
    return 'neutral' as const
  }

  private static mapScheduleDescription(
    status: OwnerTodayScheduleRow['status'],
    paymentStatus: OwnerTodayScheduleRow['paymentStatus']
  ) {
    if (status === 'cancelled') return 'Lịch đã hủy'
    if (status === 'rejected') return 'Đơn đặt bị từ chối'

    if (paymentStatus === 'paid') return 'Đã thanh toán'
    if (paymentStatus === 'partially_paid') return 'Đã đặt cọc'
    if (paymentStatus === 'refunded') return 'Đã hoàn tiền'
    return 'Chưa thanh toán'
  }

  private static mapCalendarStatus(status: OwnerCalendarBookingRow['status']) {
    if (status === 'confirmed') return 'confirmed' as const
    if (status === 'pending') return 'pending' as const
    if (status === 'completed') return 'completed' as const
    return 'cancelled' as const
  }

  private static eachDay(from: Date, to: Date) {
    const days: Date[] = []
    const cursor = new Date(from)
    cursor.setHours(0, 0, 0, 0)

    const end = new Date(to)
    end.setHours(0, 0, 0, 0)

    while (cursor <= end) {
      days.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }

    return days
  }

  private static toIsoAtTime(day: Date, hhmm: string) {
    const [h, m] = hhmm.split(':').map(Number)
    const d = new Date(day)
    d.setHours(h ?? 0, m ?? 0, 0, 0)
    return d.toISOString()
  }

  private static getPaidSuccessAmount(transactions: Array<{ amount: any }>) {
    return transactions.reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
  }

  private static derivePaymentStatus(total: number, paid: number, current: 'unpaid' | 'paid' | 'refunded' | 'partially_paid') {
    if (current === 'refunded') return 'refunded' as const
    if (paid <= 0) return 'unpaid' as const
    if (paid + 0.001 >= total) return 'paid' as const
    return 'partially_paid' as const
  }

  private static parseBookingIdCandidate(keyword: string) {
    const normalized = keyword.trim().replace(/^#/, '').toUpperCase()

    if (/^\d+$/.test(normalized)) return Number(normalized)

    const match = normalized.match(/^BK-(\d+)$/)
    if (match?.[1]) return Number(match[1])

    return undefined
  }

  private static mapOwnerCheckInBookingItem(row: {
    id: number
    startTime: Date
    endTime: Date
    totalPrice: any
    depositAmount: any
    paymentStatus: 'unpaid' | 'paid' | 'refunded' | 'partially_paid'
    checkedInAt: Date | null
    user: { fullName: string; phone: string | null }
    field: { name: string }
    transactions: Array<{ amount: any }>
  }) {
    const totalAmount = Number(row.totalPrice ?? 0)
    const paidAmount = this.getPaidSuccessAmount(row.transactions)
    const remainingAmount = Math.max(0, totalAmount - paidAmount)
    const paymentStatus = this.derivePaymentStatus(totalAmount, paidAmount, row.paymentStatus)
    const durationMins = Math.max(0, Math.round((row.endTime.getTime() - row.startTime.getTime()) / 60000))

    return {
      id: row.id,
      bookingCode: formatBookingCode(row.id),
      customerName: row.user.fullName,
      customerPhone: row.user.phone ?? 'Chưa cập nhật',
      fieldName: row.field.name,
      bookingDate: formatDateDDMMYYYY(row.startTime),
      timeLabel: formatHHmm(row.startTime) + ' - ' + formatHHmm(row.endTime) + ' (' + durationMins + ' phút)',
      totalAmount,
      depositAmount: Number(row.depositAmount ?? 0),
      remainingAmount,
      paymentStatus,
      isCheckedIn: Boolean(row.checkedInAt)
    }
  }

  static async getOwnerFacilityDetail(ownerId: number, facilityId: number) {
    const facility = await FacilitiesRepository.findOwnerFacilityDetail(ownerId, facilityId)

    if (!facility) {
      throw new AppError('Cụm sân không tồn tại hoặc bạn không có quyền truy cập', StatusCodes.NOT_FOUND)
    }

    return {
      id: facility.id,
      name: facility.name,
      description: facility.description ?? '',
      sportId: facility.sportId,
      sportName: facility.sport.name,
      status: facility.status,
      address: facility.address,
      district: facility.district ?? '',
      city: facility.city ?? '',
      latitude: facility.latitude ? Number(facility.latitude) : null,
      longitude: facility.longitude ? Number(facility.longitude) : null,
      openTime: facility.openTime ?? '',
      closeTime: facility.closeTime ?? '',
      images: facility.facilityImages.map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        isThumbnail: img.isThumbnail
      })),
      utilities: facility.facilityUtilities
        .filter((item) => item.utility)
        .map((item) => ({
          id: item.utility!.id,
          name: item.utility!.name,
          iconClass: item.utility!.iconClass ?? null
        })),
      fields: facility.fields.map((field) => ({
        id: field.id,
        name: field.name,
        description: field.description ?? '',
        status: field.status,
        pricings: field.fieldPricings.map((p) => ({
          id: p.id,
          startTime: p.startTime,
          endTime: p.endTime,
          pricePerHour: Number(p.pricePerHour),
          isWeekend: p.isWeekend
        }))
      }))
    }
  }

  static async updateOwnerFacility(ownerId: number, facilityId: number, dto: UpdateFacilityDto) {
    const facility = await FacilitiesRepository.findFacilityById(facilityId)

    if (!facility || facility.ownerId !== ownerId) {
      throw new AppError('Cụm sân không tồn tại hoặc bạn không có quyền chỉnh sửa', StatusCodes.NOT_FOUND)
    }

    if (dto.openTime && dto.closeTime && dto.openTime >= dto.closeTime) {
      throw new AppError('openTime phải nhỏ hơn closeTime', StatusCodes.BAD_REQUEST)
    }

    const utilityIds = (dto as any).utilityIds as number[] | undefined

    const data: any = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.sportId !== undefined ? { sportId: dto.sportId } : {}),
      ...(dto.district !== undefined ? { district: dto.district } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      ...(dto.openTime !== undefined ? { openTime: dto.openTime } : {}),
      ...(dto.closeTime !== undefined ? { closeTime: dto.closeTime } : {}),
      ...(Array.isArray(dto.images)
        ? {
            facilityImages: {
              deleteMany: {},
              create: dto.images.map((url, index) => ({
                imageUrl: url,
                isThumbnail: index === 0
              }))
            }
          }
        : {}),
      ...(Array.isArray(utilityIds)
        ? {
            facilityUtilities: {
              deleteMany: {},
              create: utilityIds.map((utilityId) => ({
                utilityId
              }))
            }
          }
        : {})
    }

    return FacilitiesRepository.updateOwnerFacility(facilityId, data)
  }

  static async deleteOwnerFacility(ownerId: number, facilityId: number) {
    const facility = await FacilitiesRepository.findFacilityById(facilityId)

    if (!facility || facility.ownerId !== ownerId) {
      throw new AppError('Cụm sân không tồn tại hoặc bạn không có quyền xóa', StatusCodes.NOT_FOUND)
    }

    const bookingCount = await FacilitiesRepository.countFacilityBookings(facilityId)
    if (bookingCount > 0) {
      throw new AppError('Không thể xóa cụm sân đã có lịch đặt', StatusCodes.CONFLICT)
    }

    await FacilitiesRepository.deleteOwnerFacility(facilityId)
  }

  static async updateField(ownerId: number, fieldId: number, dto: UpdateFieldDto) {
    const field = await FacilitiesRepository.findFieldById(fieldId)

    if (!field || field.facility.ownerId !== ownerId) {
      throw new AppError('Sân không tồn tại hoặc bạn không có quyền chỉnh sửa', StatusCodes.NOT_FOUND)
    }

    return FacilitiesRepository.updateField(fieldId, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {})
    })
  }

  static async deleteField(ownerId: number, fieldId: number) {
    const field = await FacilitiesRepository.findFieldById(fieldId)

    if (!field || field.facility.ownerId !== ownerId) {
      throw new AppError('Sân không tồn tại hoặc bạn không có quyền xóa', StatusCodes.NOT_FOUND)
    }

    const bookingCount = await FacilitiesRepository.countFieldBookings(fieldId)
    if (bookingCount > 0) {
      throw new AppError('Không thể xóa sân đã có lịch đặt', StatusCodes.CONFLICT)
    }

    await FacilitiesRepository.deleteField(fieldId)
  }

  static async getFieldPrices(ownerId: number, fieldId: number) {
    const field = await FacilitiesRepository.findFieldById(fieldId)

    if (!field || field.facility.ownerId !== ownerId) {
      throw new AppError('Sân không tồn tại hoặc bạn không có quyền xem giá', StatusCodes.NOT_FOUND)
    }

    const prices = await FacilitiesRepository.findPricingsByField(fieldId)

    return prices.map((p) => ({
      id: p.id,
      startTime: p.startTime,
      endTime: p.endTime,
      pricePerHour: Number(p.pricePerHour),
      isWeekend: p.isWeekend
    }))
  }

  // =========================Service func===========================
  static async createFacility(ownerId: number, dto: CreateFacilityDto) {
    const user = await UsersRepository.findById(ownerId)
    if (!user) throw new AppError('User không tồn tại', StatusCodes.NOT_FOUND)
    if (user?.roleId === ROLES.CUSTOMER) {
      await UsersRepository.upgradeToOwner(ownerId)
    }

    return FacilitiesRepository.createFacility(ownerId, dto)
  }

  static async getMyFacilities(params: OwnerFacilitiesListParams) {
    const result = await FacilitiesRepository.findFacilitiesByOwner(params)

    return {
      data: result.data.map((facility) => ({
        id: facility.id,
        name: facility.name,
        status: facility.status,
        sportName: facility.sport.name,
        address: facility.address,
        district: facility.district ?? '',
        city: facility.city ?? '',
        openTime: facility.openTime ?? '--:--',
        closeTime: facility.closeTime ?? '--:--',
        fieldsCount: facility.fields.length,
        fields: facility.fields.map((field) => ({
          id: field.id,
          name: field.name,
          status: field.status,
          priceFrom: Number(field.fieldPricings[0]?.pricePerHour ?? 0)
        }))
      })),
      pagination: result.pagination
    }
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

  static async getOwnerOverviewStats(ownerId: number): Promise<{ stats: OwnerOverviewStatItem[] }> {
    const raw = await FacilitiesRepository.getOwnerOverviewStatsRaw(ownerId)

    const stats: OwnerOverviewStatItem[] = [
      {
        key: 'todayBookings',
        value: raw.todayBookings,
        changePercent: this.calculateChangePercent(raw.todayBookings, raw.yesterdayBookings)
      },
      {
        key: 'monthlyRevenue',
        value: raw.monthlyRevenue,
        changePercent: this.calculateChangePercent(raw.monthlyRevenue, raw.previousMonthRevenue)
      },
      {
        key: 'newCustomers',
        value: raw.newCustomers7d,
        changePercent: this.calculateChangePercent(raw.newCustomers7d, raw.previousNewCustomers7d)
      },
      {
        key: 'completedBookings',
        value: raw.completedBookingsMonth,
        changePercent: this.calculateChangePercent(raw.completedBookingsMonth, raw.previousCompletedBookingsMonth)
      }
    ]

    return { stats }
  }

  static async getOwnerOverview(ownerId: number, params: OwnerOverviewParams) {
    const { start, end } = this.resolveDayRange(params.date)

    const [statsData, recentResult, scheduleRows] = await Promise.all([
      this.getOwnerOverviewStats(ownerId),
      FacilitiesRepository.getOwnerOverviewRecentBookings(ownerId, start, end, {
        page: params.recentPage,
        limit: params.recentLimit
      }),
      FacilitiesRepository.getOwnerOverviewTodaySchedule(ownerId, start, end, params.scheduleLimit)
    ])

    const recentBookings = recentResult.data.map((row: OwnerRecentBookingRow) => ({
      id: '#BK-' + String(row.id).padStart(6, '0'),
      customerName: row.user.fullName,
      fieldName: row.field.name,
      sportName: row.field.facility.sport.name,
      timeLabel: formatHHmm(row.startTime) + ' - ' + formatHHmm(row.endTime),
      status: this.mapRecentStatus(row.status)
    }))

    const todaySchedule = scheduleRows.map((row: OwnerTodayScheduleRow) => ({
      id: String(row.id),
      time: formatHHmm(row.startTime),
      title: row.user.fullName + ' - ' + row.field.name,
      description: this.mapScheduleDescription(row.status, row.paymentStatus),
      status: this.mapScheduleStatus(row.status)
    }))

    return {
      stats: statsData.stats,
      recentBookings,
      recentPagination: recentResult.pagination,
      todaySchedule
    }
  }

  static async getOwnerCalendar(ownerId: number, params: OwnerCalendarParams) {
    const [facilities, bookings, maintenanceFields] = await Promise.all([
      FacilitiesRepository.getOwnerCalendarFacilities(ownerId),
      FacilitiesRepository.getOwnerCalendarBookings(ownerId, params.from, params.to),
      FacilitiesRepository.getOwnerCalendarMaintenanceFields(ownerId)
    ])

    const eventsFromBookings = bookings.map((row: OwnerCalendarBookingRow) => ({
      id: 'booking-' + row.id,
      title: row.user.fullName,
      facilityId: row.field.facility.id,
      facilityName: row.field.facility.name,
      fieldName: row.field.name,
      start: row.startTime.toISOString(),
      end: row.endTime.toISOString(),
      status: this.mapCalendarStatus(row.status),
      customerName: row.user.fullName
    }))

    const days = this.eachDay(params.from, params.to)
    const eventsFromMaintenance = maintenanceFields.flatMap((field: OwnerCalendarMaintenanceFieldRow) =>
      days.map((day) => {
        const openTime = field.facility.openTime ?? '08:00'
        const closeTime = field.facility.closeTime ?? '22:00'

        return {
          id: 'maintenance-' + field.id + '-' + day.toISOString().slice(0, 10),
          title: 'Bảo trì mặt sân',
          facilityId: field.facility.id,
          facilityName: field.facility.name,
          fieldName: field.name,
          start: this.toIsoAtTime(day, openTime),
          end: this.toIsoAtTime(day, closeTime),
          status: 'maintenance' as const
        }
      })
    )

    return {
      facilities: facilities.map((f) => ({ id: f.id, name: f.name })),
      events: [...eventsFromBookings, ...eventsFromMaintenance]
    }
  }

  static async searchOwnerCheckInBooking(ownerId: number, keyword: string) {
    const normalized = keyword.trim()
    if (!normalized) return null

    const bookingIdCandidate = this.parseBookingIdCandidate(normalized)
    const row = await FacilitiesRepository.findOwnerCheckInBooking(ownerId, normalized, bookingIdCandidate)

    if (!row) return null

    return this.mapOwnerCheckInBookingItem(row)
  }

  static async getOwnerCheckInHistory(ownerId: number, params: { page: number; limit: number; date?: string }) {
    const { start, end } = this.resolveDayRange(params.date)

    const result = await FacilitiesRepository.findOwnerCheckInHistory(ownerId, start, end, params.page, params.limit)

    return {
      data: result.data.map((row) => ({
        id: row.id,
        checkedInTime: row.checkedInAt ? formatHHmm(row.checkedInAt) : '--:--',
        customerName: row.user.fullName,
        fieldName: row.field.name,
        status: 'checked_in' as const
      })),
      pagination: result.pagination
    }
  }

  static async completeOwnerCheckIn(ownerId: number, bookingId: number, collectedRemaining: boolean) {
    const current = await FacilitiesRepository.findOwnerCheckInBookingById(ownerId, bookingId)

    if (!current) {
      throw new AppError('Không tìm thấy lượt đặt sân', StatusCodes.NOT_FOUND)
    }

    if (!['confirmed', 'completed'].includes(current.status)) {
      throw new AppError('Chỉ có thể check-in booking đã xác nhận', StatusCodes.BAD_REQUEST)
    }

    if (current.checkedInAt) {
      throw new AppError('Booking này đã check-in trước đó', StatusCodes.CONFLICT)
    }

    const totalAmount = Number(current.totalPrice ?? 0)
    const paidAmount = this.getPaidSuccessAmount(current.transactions)
    const remainingAmount = Math.max(0, totalAmount - paidAmount)

    if (remainingAmount > 0 && !collectedRemaining) {
      throw new AppError('Cần xác nhận đã thu tiền còn lại trước khi check-in', StatusCodes.BAD_REQUEST)
    }

    const updated = await FacilitiesRepository.completeOwnerCheckIn(ownerId, bookingId, remainingAmount)

    if (!updated) {
      throw new AppError('Booking này vừa được check-in ở phiên khác', StatusCodes.CONFLICT)
    }

    return this.mapOwnerCheckInBookingItem(updated)
  }

  // Public route
  static async getFeaturedFacilities() {
    return await FacilitiesRepository.findFeaturedFacilities()
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
      const matchedPricings = field.fieldPricings.filter((pricing) => pricing.isWeekend === isWeekend)

      const slots = this.buildHourlySlots(matchedPricings, field.bookings)

      const fromPrice = slots.length > 0 ? Math.min(...slots.map((s) => Number(s.pricePerHour))) : null

      return {
        id: field.id,
        name: field.name,
        description: field.description,
        fromPrice,
        slots
      }
    })
  }

  static async ownerRejectBooking(ownerId: number, bookingId: number, reason: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        field: { select: { facility: { select: { ownerId: true } } } },
        user: { select: { id: true, bankName: true, bankAccount: true, accountHolder: true } }
      }
    })

    if (!booking) throw new AppError('Không tìm thấy booking', StatusCodes.NOT_FOUND)
    if (booking.field.facility.ownerId !== ownerId) throw new AppError('Không có quyền', StatusCodes.FORBIDDEN)
    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new AppError('Không thể từ chối booking ở trạng thái này', StatusCodes.BAD_REQUEST)
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'rejected',
          rejectionReason: reason
        }
      })

      if (['paid', 'partially_paid'].includes(booking.paymentStatus)) {
        const refundAmount = booking.paymentStatus === 'paid' ? Number(booking.totalPrice) : Number(booking.depositAmount)

        await tx.refundRequest.create({
          data: {
            userId: booking.userId,
            bookingId: bookingId,
            amount: refundAmount,
            bankName: booking.user.bankName || 'Chưa cập nhật',
            bankAccount: booking.user.bankAccount || 'Chưa cập nhật',
            accountHolder: booking.user.accountHolder || 'Chưa cập nhật',
            reason: `Chủ sân từ chối: ${reason}`,
            status: 'pending'
          }
        })
      }
    })
  }
}
