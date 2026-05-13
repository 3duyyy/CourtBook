import { payos } from '../../shared/payos/client'
import { prisma } from '../../shared/prisma/client'
import { BookingsRepository } from '../bookings/bookings.repository'

export class PaymentsService {
  static async handlePayosWebhook(webhookBody: any) {
    const isValid = payos.webhooks.verify(webhookBody)
    if (!isValid) {
      console.log('Invalid webhook signature')
      return
    }

    const { data } = webhookBody
    if (!data || data.code !== '00') {
      console.log('Payment failed or no data:', data)
      return
    }

    const orderCode = data.orderCode
    const booking = await BookingsRepository.findByPayosOrderCode(orderCode)
    if (!booking) {
      console.log('Booking not found for orderCode:', orderCode)
      return
    }

    if (booking.status !== 'pending') {
      console.log('Booking already processed:', booking.id)
      return
    }

    const transaction = booking.transactions[0]
    if (!transaction) return

    const paidAmount = Number(transaction.amount)
    const totalPrice = Number(booking.totalPrice)
    const paymentOption = paidAmount >= totalPrice ? 'full' : 'deposit'

    await BookingsRepository.confirmPayment(booking.id, transaction.id, paymentOption)
    console.log(`Booking #${booking.id} confirmed via PayOS`)
  }

  static async getPaymentResult(orderCode: number) {
    const booking = await BookingsRepository.findByPayosOrderCode(orderCode)
    if (!booking) {
      return { status: 'not_found' }
    }

    return {
      bookingId: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalPrice: Number(booking.totalPrice),
      checkInCode: booking.checkInCode
    }
  }

  static async cancelPayment(orderCode: number) {
    const booking = await BookingsRepository.findByPayosOrderCode(orderCode)
    if (!booking || booking.status !== 'pending') {
      return { status: 'already_processed' }
    }

    await BookingsRepository.cancelByPayosOrderCode(orderCode)

    if (booking.transactions[0]) {
      await prisma.transaction.update({
        where: { id: booking.transactions[0].id },
        data: { status: 'failed' }
      })
    }

    return { status: 'cancelled', bookingId: booking.id }
  }
}
