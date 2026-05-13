import { StatusCodes } from 'http-status-codes'
import { CreateBookingDto } from '../../dtos/bookings.dto'
import { AppError } from '../../shared/exceptions'
import { BookingsRepository } from './bookings.repository'
import { timeToMinutes } from '../../shared/utils/format'
import crypto from 'crypto'
import { payos } from '../../shared/payos/client'
import { env } from '../../config/env.config'

export class BookingsService {
  static async createBooking(userId: number, dto: CreateBookingDto) {
    const field = await BookingsRepository.findFieldWithPricing(dto.fieldId)

    if (!field) {
      throw new AppError('Sân không tồn tại', StatusCodes.NOT_FOUND)
    }
    if (field.status !== 'active') {
      throw new AppError('Sân hiện không hoạt động', StatusCodes.BAD_REQUEST)
    }
    if (!field.facility || field.facility.status !== 'active') {
      throw new AppError('Cơ sở thể thao chưa được kích hoạt', StatusCodes.BAD_REQUEST)
    }

    const now = new Date()
    const bookingDate = new Date(dto.date + 'T00:00:00')
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (bookingDate < today) {
      throw new AppError('Không thể đặt sân cho ngày đã qua', StatusCodes.BAD_REQUEST)
    }

    const sortedSlots = [...dto.slots].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

    for (const slot of sortedSlots) {
      if (timeToMinutes(slot.startTime) >= timeToMinutes(slot.endTime))
        throw new AppError(`Khung giờ ${slot.startTime} - ${slot.endTime} không hợp lệ`, StatusCodes.BAD_REQUEST)
    }

    if (field.facility.openTime && field.facility.closeTime) {
      const openMin = timeToMinutes(field.facility.openTime)
      const closeMin = timeToMinutes(field.facility.closeTime)
      for (const slot of sortedSlots) {
        if (timeToMinutes(slot.startTime) < openMin || timeToMinutes(slot.endTime) > closeMin) {
          throw new AppError(`Khung giờ ${slot.startTime} - ${slot.endTime} ngoài giờ hoạt động`, StatusCodes.BAD_REQUEST)
        }
      }
    }

    const isWeekend = [0, 6].includes(bookingDate.getDay())
    const slotRanges = sortedSlots.map((slot) => {
      const [sh, sm] = slot.startTime.split(':').map(Number)
      const [eh, em] = slot.endTime.split(':').map(Number)
      const start = new Date(bookingDate)
      start.setHours(sh!, sm!, 0, 0)
      const end = new Date(bookingDate)
      end.setHours(eh!, em!, 0, 0)
      return { start, end }
    })

    if (bookingDate.getTime() === today.getTime()) {
      const minTime = new Date(now.getTime() + 30 * 60 * 1000)
      if (slotRanges[0]!.start <= minTime) {
        throw new AppError('Phải đặt sân trước ít nhất 30 phút', StatusCodes.BAD_REQUEST)
      }
    }

    const conflicts = await BookingsRepository.findConflictingBookings(dto.fieldId, slotRanges)
    if (conflicts.length > 0) {
      throw new AppError('Khung giờ đã được đặt bởi người khác', StatusCodes.CONFLICT)
    }

    let totalPrice = 0
    for (const slot of sortedSlots) {
      const slotStartMin = timeToMinutes(slot.startTime)
      const slotEndMin = timeToMinutes(slot.endTime)
      const hours = (slotEndMin - slotStartMin) / 60
      const pricing =
        field.fieldPricings.find((p) => {
          const pStart = timeToMinutes(p.startTime)
          const pEnd = timeToMinutes(p.endTime)
          return slotStartMin >= pStart && slotEndMin <= pEnd && p.isWeekend === isWeekend
        }) ||
        field.fieldPricings.find((p) => {
          const pStart = timeToMinutes(p.startTime)
          const pEnd = timeToMinutes(p.endTime)
          return slotStartMin >= pStart && slotEndMin <= pEnd
        })
      if (!pricing) throw new AppError(`Không tìm thấy bảng giá cho ${slot.startTime} - ${slot.endTime}`, StatusCodes.BAD_REQUEST)
      totalPrice += Number(pricing.pricePerHour) * hours
    }

    totalPrice = Math.round(totalPrice)
    const depositAmount = Math.round(totalPrice * 0.3)
    const checkInCode = 'CK-' + crypto.randomBytes(4).toString('hex').toUpperCase()

    const payosOrderCode = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-13))
    const paidAmount = dto.paymentOption === 'full' ? totalPrice : depositAmount

    const booking = await BookingsRepository.createBookingWithTransaction({
      userId,
      fieldId: dto.fieldId,
      startTime: slotRanges[0]!.start,
      endTime: slotRanges[slotRanges.length - 1]!.end,
      totalPrice,
      depositAmount,
      paymentOption: dto.paymentOption,
      ...(dto.note !== undefined ? { note: dto.note } : {}),
      checkInCode,
      payosOrderCode
    })

    const payosResult = await payos.paymentRequests.create({
      orderCode: payosOrderCode,
      amount: paidAmount,
      description: `Dat san #${booking.id}`,
      returnUrl: env.PAYOS_RETURN_URL!,
      cancelUrl: env.PAYOS_CANCEL_URL!,
      items: [
        {
          name: dto.paymentOption === 'full' ? 'Thanh toan toan bo' : 'Dat coc 30%',
          quantity: 1,
          price: paidAmount
        }
      ]
    })

    return {
      id: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalPrice,
      depositAmount,
      paidAmount: dto.paymentOption === 'full' ? totalPrice : depositAmount,
      checkInCode,
      checkoutUrl: payosResult.checkoutUrl,
      qrCode: payosResult.qrCode,
      payosOrderCode
    }
  }
}
