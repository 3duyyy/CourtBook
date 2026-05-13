import { SYSTEM_PROMPT } from '../../shared/constants/common'
import { gemini } from '../../shared/gemini/client'
import { groq } from '../../shared/groq/client'
import { prisma } from '../../shared/prisma/client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export class ChatbotService {
  /**
   * Chat không cần đăng nhập (FAQ chung)
   */
  static async chat(message: string, history: ChatMessage[]) {
    const contents = [
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        parts: [{ text: msg.content }]
      })),
      { role: 'user' as const, parts: [{ text: message }] }
    ]

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((msg) => ({
          role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: msg.content
        })),
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
    return {
      reply: response.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.'
    }
  }

  /**
   * Chat có context booking của user (cần đăng nhập)
   */
  static async chatWithContext(userId: number, message: string, history: ChatMessage[]) {
    let userContext = ''

    const bookingKeywords = ['booking', 'đặt sân', 'lịch đặt', 'đơn đặt', 'check-in', 'hoàn tiền']

    const isAskingAboutBooking = bookingKeywords.some((kw) => message.toLowerCase().includes(kw))

    if (isAskingAboutBooking) {
      const recentBookings = await prisma.booking.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          field: {
            include: {
              facility: { select: { name: true, address: true } }
            }
          }
        }
      })

      if (recentBookings.length > 0) {
        userContext = `\n\n## Booking gần đây của user:\n`
        userContext += recentBookings
          .map(
            (b) =>
              `- #BK-${b.id}: ${b.field.facility.name} - ${b.field.name}, ` +
              `ngày ${b.startTime.toLocaleDateString('vi-VN')}, ` +
              `${b.startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${b.endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, ` +
              `trạng thái: ${b.status}, thanh toán: ${b.paymentStatus}, ` +
              `mã check-in: ${b.checkInCode || 'chưa có'}`
          )
          .join('\n')
      }
    }

    // Nếu user hỏi tìm sân thì query danh sách sân
    const searchKeywords = ['tìm sân', 'sân nào', 'ở đâu', 'gần đây', 'sân bóng', 'sân cầu lông']

    const isSearching = searchKeywords.some((kw) => message.toLowerCase().includes(kw))

    if (isSearching) {
      const facilities = await prisma.facility.findMany({
        where: { status: 'active' },
        take: 5,
        select: {
          name: true,
          address: true,
          sport: { select: { name: true } },
          openTime: true,
          closeTime: true
        }
      })

      if (facilities.length > 0) {
        userContext += `\n\n## Danh sách sân khả dụng:\n`
        userContext += facilities
          .map(
            (f) =>
              `- ${f.name} (${f.sport?.name || 'Đa môn'}): ${f.address}, ` +
              `giờ mở: ${f.openTime || '06:00'} - ${f.closeTime || '22:00'}`
          )
          .join('\n')
      }
    }

    const fullSystemPrompt = SYSTEM_PROMPT + userContext

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: fullSystemPrompt },
        ...history.map((msg) => ({
          role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: msg.content
        })),
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
    return {
      reply: response.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời lúc này.'
    }
  }
}
