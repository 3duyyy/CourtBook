import { Prisma } from '../../../../generated/prisma'
import { prisma } from '../../../shared/prisma/client'
import { AppError } from '../../../shared/exceptions'
import { StatusCodes } from 'http-status-codes'
import { FindManyPaymentVerificationsParams, PaymentVerificationStatus } from '../../../shared/types/admin'
import { toNumber } from '../../../shared/utils/utils'

type PaymentVerificationType = 'full_payment' | 'deposit'

export const mapStatusToDb = (status?: PaymentVerificationStatus) => {
  if (!status) return undefined
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'failed'
  return 'pending'
}

interface PaymentVerificationRowRaw {
  id: number
  transactionId: number
  bookingId: number
  bookingStatus: string
  customerName: string
  customerAvatarUrl: string | null
  facilityName: string
  fieldName: string
  verificationType: PaymentVerificationType
  amount: string | number
  status: PaymentVerificationStatus
  transferredAt: Date | string
}

const deriveBookingPaymentStatus = (totalPrice: number, successfulPaidAmount: number) => {
  if (successfulPaidAmount <= 0) return 'unpaid' as const
  if (successfulPaidAmount + 0.001 >= totalPrice) return 'paid' as const
  return 'partially_paid' as const
}

export class AdminPaymentVerificationsRepository {
  static async findManyForAdmin(params: FindManyPaymentVerificationsParams) {
    const page = Math.max(1, params.page)
    const limit = Math.min(100, Math.max(1, params.limit))
    const offset = (page - 1) * limit
    const keyword = params.keyword?.trim() ?? ''

    const mappedStatus = mapStatusToDb(params.status)

    const statusSql = mappedStatus ? Prisma.sql`AND t.status = ${mappedStatus}` : Prisma.empty

    const fromSql = params.from ? Prisma.sql`AND t.created_at >= ${params.from}` : Prisma.empty

    const toSql = params.to ? Prisma.sql`AND t.created_at <= ${params.to}` : Prisma.empty

    const keywordSql = keyword
      ? Prisma.sql`
          AND (
            u.full_name LIKE ${'%' + keyword + '%'}
            OR f.name LIKE ${'%' + keyword + '%'}
            OR fld.name LIKE ${'%' + keyword + '%'}
            OR CAST(b.id AS CHAR) LIKE ${'%' + keyword + '%'}
            OR CAST(t.id AS CHAR) LIKE ${'%' + keyword + '%'}
          )
        `
      : Prisma.empty

    const verificationTypeSql = params.verificationType
      ? Prisma.sql`
          AND (
            CASE
              WHEN b.deposit_amount IS NOT NULL
                AND b.deposit_amount > 0
                AND t.amount < b.total_price
              THEN 'deposit'
              ELSE 'full_payment'
            END
          ) = ${params.verificationType}
        `
      : Prisma.empty

    const orderByColumn = params.sortBy === 'amount' ? Prisma.sql`t.amount` : Prisma.sql`t.created_at`
    const orderDir = params.sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`

    const baseWhereSql = Prisma.sql`
      FROM transactions t
      INNER JOIN bookings b ON b.id = t.booking_id
      INNER JOIN users u ON u.id = b.user_id
      INNER JOIN fields fld ON fld.id = b.field_id
      INNER JOIN facilities f ON f.id = fld.facility_id
      WHERE t.type = 'payment'
      AND t.method IN ('qr_transfer', 'payos')
      ${statusSql}
      ${fromSql}
      ${toSql}
      ${keywordSql}
      ${verificationTypeSql}
    `

    const listSql = Prisma.sql`
      SELECT
        t.id AS id,
        t.id AS transactionId,
        b.id AS bookingId,
        b.status AS bookingStatus,
        u.full_name AS customerName,
        u.avatar_url AS customerAvatarUrl,
        f.name AS facilityName,
        fld.name AS fieldName,
        CASE
          WHEN b.deposit_amount IS NOT NULL
            AND b.deposit_amount > 0
            AND t.amount < b.total_price
          THEN 'deposit'
          ELSE 'full_payment'
        END AS verificationType,
        t.amount AS amount,
        CASE
          WHEN t.status = 'pending' THEN 'pending'
          WHEN t.status = 'success' THEN 'approved'
          ELSE 'rejected'
        END AS status,
        t.created_at AS transferredAt
      ${baseWhereSql}
      ORDER BY ${orderByColumn} ${orderDir}, t.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countSql = Prisma.sql`
      SELECT COUNT(*) AS total
      ${baseWhereSql}
    `

    const [rows, countRows] = await prisma.$transaction([
      prisma.$queryRaw<PaymentVerificationRowRaw[]>(listSql),
      prisma.$queryRaw<Array<{ total: bigint | number }>>(countSql)
    ])

    const total = Number(countRows[0]?.total ?? 0)

    return {
      data: rows.map((row) => ({
        id: row.id,
        transactionId: row.transactionId,
        bookingId: row.bookingId,
        bookingStatus: row.bookingStatus,
        customerName: row.customerName,
        customerAvatarUrl: row.customerAvatarUrl,
        facilityName: row.facilityName,
        fieldName: row.fieldName,
        verificationType: row.verificationType,
        amount: toNumber(row.amount),
        status: row.status,
        transferredAt: new Date(row.transferredAt).toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    }
  }

  static async review(transactionId: number, action: 'approve' | 'reject', reason?: string) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: {
          booking: {
            select: {
              id: true,
              totalPrice: true,
              status: true,
              userId: true
            }
          }
        }
      })

      if (!current) {
        throw new AppError('Không tìm thấy giao dịch', StatusCodes.NOT_FOUND)
      }

      if (current.type !== 'payment') {
        throw new AppError('Chỉ hỗ trợ xác minh giao dịch thanh toán', StatusCodes.BAD_REQUEST)
      }

      if (current.status !== 'pending') {
        throw new AppError('Giao dịch này đã được xử lý trước đó', StatusCodes.CONFLICT)
      }

      const nextStatus = action === 'approve' ? 'success' : 'failed'
      const nextDescription =
        action === 'reject' && reason
          ? [current.description, 'Reject reason: ' + reason].filter(Boolean).join(' | ')
          : current.description

      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: nextStatus,
          description: nextDescription
        }
      })

      const paidAgg = await tx.transaction.aggregate({
        _sum: { amount: true },
        where: {
          bookingId: current.booking.id,
          type: 'payment',
          status: 'success'
        }
      })

      const successfulPaidAmount = Number(paidAgg._sum.amount ?? 0)
      const totalPrice = Number(current.booking.totalPrice)

      if (action === 'approve') {
        const isBookingDead = current.booking.status === 'cancelled' || current.booking.status === 'rejected'

        if (isBookingDead) {
          const user = await tx.user.findUnique({ where: { id: current.booking.userId } })
          await tx.refundRequest.create({
            data: {
              bookingId: current.booking.id,
              userId: current.booking.userId,
              amount: current.amount,
              status: 'pending',
              bankName: user?.bankName || 'Chưa cập nhật',
              bankAccount: user?.bankAccount || 'Chưa cập nhật',
              accountHolder: user?.accountHolder || 'Chưa cập nhật'
            }
          })

          await tx.booking.update({
            where: { id: current.booking.id },
            data: { paymentStatus: 'refunded' }
          })
        } else if (current.booking.status === 'pending') {
          await tx.booking.update({
            where: { id: current.booking.id },
            data: {
              status: 'confirmed',
              paymentStatus: deriveBookingPaymentStatus(totalPrice, successfulPaidAmount)
            }
          })
        }
      } else {
        // await tx.booking.update({
        //   where: { id: current.booking.id },
        //   data: { paymentStatus: deriveBookingPaymentStatus(totalPrice, successfulPaidAmount) }
        // })

        const isPayosPayment = current.method === 'payos'
        const hasBeenPaid = successfulPaidAmount > 0 || isPayosPayment

        if (hasBeenPaid) {
          // Đổi booking status thành rejected
          await tx.booking.update({
            where: { id: current.booking.id },
            data: {
              status: 'rejected',
              paymentStatus: 'refunded',
              rejectionReason: reason || 'Admin từ chối - hoàn tiền'
            }
          })

          // Tạo RefundRequest để admin biết cần hoàn tiền
          const user = await tx.user.findUnique({ where: { id: current.booking.userId } })
          await tx.refundRequest.create({
            data: {
              bookingId: current.booking.id,
              userId: current.booking.userId,
              amount: current.amount,
              status: 'pending',
              reason: reason || 'Admin từ chối thanh toán - hoàn tiền cho khách',
              bankName: user?.bankName || 'Chưa cập nhật',
              bankAccount: user?.bankAccount || 'Chưa cập nhật',
              accountHolder: user?.accountHolder || 'Chưa cập nhật'
            }
          })
        } else {
          // Chưa thanh toán thì chỉ update paymentStatus
          await tx.booking.update({
            where: { id: current.booking.id },
            data: { paymentStatus: deriveBookingPaymentStatus(totalPrice, successfulPaidAmount) }
          })
        }
      }

      return updatedTx
    })
  }
}
