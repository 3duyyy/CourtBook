import { StatusCodes } from 'http-status-codes'
import { AppError } from '../../shared/exceptions'
import { formatDateDDMMYYYY, formatHHmm } from '../../shared/utils/format'
import { formatBookingCode } from '../../shared/utils/utils'
import { UsersRepository } from './users.repository'

type BookingTab = 'all' | 'pending_confirmation' | 'upcoming' | 'completed' | 'cancelled'
type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected'
type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'partially_paid'

const CANCEL_LOCK_HOURS = 2
const CANCEL_LOCK_MS = CANCEL_LOCK_HOURS * 60 * 60 * 1000

export class UserService {
  private static mapTab(
    status: BookingStatus,
    endTime: Date,
    now: Date
  ): 'pending_confirmation' | 'upcoming' | 'completed' | 'cancelled' {
    if (status === 'pending') return 'pending_confirmation'
    if (status === 'cancelled' || status === 'rejected') return 'cancelled'
    if (status === 'completed') return 'completed'

    // confirmed nhưng đã qua giờ kết thúc thì coi như completed ở góc nhìn user
    if (status === 'confirmed' && endTime.getTime() <= now.getTime()) return 'completed'

    return 'upcoming'
  }

  private static mapPaymentBadge(status: BookingStatus, paymentStatus: PaymentStatus) {
    if (status === 'pending') return 'Chờ xác nhận' as const
    if (paymentStatus === 'refunded') return 'Đã hoàn tiền' as const
    if (paymentStatus === 'paid') return 'Đã thanh toán' as const
    if (paymentStatus === 'partially_paid') return 'Đã cọc' as const
    return 'Chờ thanh toán' as const
  }

  private static mapPaymentNote(status: BookingStatus, paymentStatus: PaymentStatus, rejectionReason: string | null) {
    if (status === 'rejected') return rejectionReason || 'Đơn đặt bị từ chối'
    if (status === 'cancelled') return 'Đơn đã bị hủy'
    if (paymentStatus === 'refunded') return 'Đã hoàn tiền'
    if (paymentStatus === 'paid') return 'Đã thanh toán đầy đủ'
    if (paymentStatus === 'partially_paid') return 'Thanh toán phần còn lại tại sân'
    if (status === 'pending') return 'Bạn đã gửi yêu cầu thanh toán, đang chờ xác nhận'
    return 'Chờ thanh toán'
  }

  private static getConfirmedPaidAmount(transactions: Array<{ amount: any; status: string }>) {
    return transactions.filter((tx) => tx.status === 'success').reduce((sum, tx) => sum + Number(tx.amount ?? 0), 0)
  }

  private static getTotalPaidAmount(transactions: Array<{ amount: any }>) {
    return transactions.reduce((sum, tx) => sum + Number(tx.amount ?? 0), 0)
  }

  static async getProfile(userId: number) {
    const user = await UsersRepository.getProfile(userId)
    if (!user) throw new AppError('Không tìm thấy người dùng', StatusCodes.NOT_FOUND)

    return user
  }

  static async updateProfile(userId: number, data: any) {
    const user = await UsersRepository.getProfile(userId)
    if (!user) throw new AppError('Không tìm thấy người dùng', StatusCodes.NOT_FOUND)

    return UsersRepository.updateProfile(userId, data)
  }

  static async getMyBookings(userId: number, params: { page: number; limit: number; tab: BookingTab }) {
    const now = new Date()
    const result = await UsersRepository.findMyBookings({
      userId,
      page: params.page,
      limit: params.limit,
      tab: params.tab,
      now
    })

    const tabCounts = await UsersRepository.countMyBookingsByTab(userId, now)

    const data = result.data.map((row) => {
      const totalPrice = Number(row.totalPrice ?? 0)
      const depositAmount = row.depositAmount != null ? Number(row.depositAmount) : null
      const paidAmount = this.getTotalPaidAmount(row.transactions)
      const remainingAmount = Math.max(0, totalPrice - paidAmount)

      const tab = this.mapTab(row.status, row.endTime, now)
      const canCancelByStatus = row.status === 'pending' || row.status === 'confirmed'
      const canCancelByTime = row.startTime.getTime() - now.getTime() > CANCEL_LOCK_MS
      const canCancel = canCancelByStatus && canCancelByTime

      const facilityAddress = [row.field.facility.address, row.field.facility.district, row.field.facility.city]
        .filter(Boolean)
        .join(', ')

      return {
        id: row.id,
        bookingCode: formatBookingCode(row.id),
        tab,
        sportName: row.field.facility.sport.name,
        facilityName: row.field.facility.name,
        fieldName: row.field.name,
        facilityAddress,
        facilityImage:
          row.field.facility.facilityImages[0]?.imageUrl || 'https://ui-avatars.com/api/?name=Facility&background=E2E8F0&color=334155',
        bookingDate: formatDateDDMMYYYY(row.startTime),
        startTime: formatHHmm(row.startTime),
        endTime: formatHHmm(row.endTime),
        totalPrice,
        depositAmount,
        remainingAmount,
        checkInCode: row.checkInCode,
        paymentBadge: this.mapPaymentBadge(row.status, row.paymentStatus),
        paymentNote: this.mapPaymentNote(row.status, row.paymentStatus, row.rejectionReason),
        canViewDetail: true,
        canCancel,
        canViewReceipt: row.paymentStatus === 'paid' || row.paymentStatus === 'refunded',
        canPayRemainingAtVenue: remainingAmount > 0 && (row.status === 'confirmed' || row.status === 'pending'),
        cancelBlockedReason: canCancelByStatus && !canCancel ? 'Không thể hủy lịch trong vòng 2 tiếng trước giờ bắt đầu' : null
      }
    })
    return {
      data,
      pagination: result.pagination,
      tabCounts
    }
  }

  static async cancelMyBooking(userId: number, bookingId: number, reason?: string) {
    const now = new Date()

    const current = await UsersRepository.findMyBookingForCancel(userId, bookingId)
    if (!current) {
      throw new AppError('Không tìm thấy lịch đặt', StatusCodes.NOT_FOUND)
    }

    if (!['pending', 'confirmed'].includes(current.status)) {
      throw new AppError('Chỉ có thể hủy lịch ở trạng thái chờ xác nhận hoặc sắp tới', StatusCodes.BAD_REQUEST)
    }

    const diffMs = current.startTime.getTime() - now.getTime()
    if (diffMs <= CANCEL_LOCK_MS) {
      throw new AppError('Không thể hủy lịch trong vòng 2 tiếng trước giờ bắt đầu', StatusCodes.BAD_REQUEST)
    }

    const lockThreshold = new Date(now.getTime() + CANCEL_LOCK_MS)
    const updated = await UsersRepository.cancelMyBooking(userId, bookingId, lockThreshold, reason)

    if (!updated) {
      throw new AppError('Không thể hủy lịch do trạng thái đã thay đổi ở phiên khác', StatusCodes.CONFLICT)
    }

    return {
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString()
    }
  }
}
