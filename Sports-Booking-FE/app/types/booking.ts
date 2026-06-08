import type { PaginationMeta } from "./common"

export type PaymentOption = "deposit" | "full"

export interface BookingDraftSlot {
  id: string
  startTime: string
  endTime: string
  price: number
}

export interface BookingDraft {
  facilityId: number
  facilityName: string
  facilityAddress: string
  facilityImage: string | null
  sportName: string
  fieldId: number
  fieldName: string
  date: string
  slots: BookingDraftSlot[]
  totalPrice: number
}

// My bookings
export type CustomerBookingTab = "upcoming" | "pending_confirmation" | "completed" | "cancelled"

export type CustomerPaymentBadge =
  | "Đã cọc"
  | "Đã thanh toán"
  | "Chờ xác nhận"
  | "Chờ thanh toán"
  | "Đã hoàn tiền"
  | "Thanh toán một phần"

export interface CustomerBookingItem {
  id: number
  bookingCode: string

  tab: CustomerBookingTab

  sportName: string
  facilityName: string
  fieldName: string

  facilityAddress: string
  facilityImage: string

  bookingDate: string
  startTime: string
  endTime: string

  totalPrice: number
  depositAmount?: number | null
  remainingAmount?: number | null

  paymentBadge: CustomerPaymentBadge
  paymentNote?: string | null

  canViewDetail?: boolean
  canCancel?: boolean
  canViewReceipt?: boolean
  canPayRemainingAtVenue?: boolean

  cancelBlockedReason?: string | null
  checkInCode?: string | null
}

export interface MyBookingsQueryParams {
  page?: number
  limit?: number
  tab?: CustomerBookingTab | "all"
}

export interface CancelMyBookingPayload {
  reason?: string
}

export interface CancelMyBookingResult {
  id: number
  status: "cancelled"
  updatedAt: string
}

export interface MyBookingsListApiResponse {
  success: boolean
  data: CustomerBookingItem[]
  pagination: PaginationMeta
  tabCounts: Record<CustomerBookingTab, number>
  message?: string
}

export interface CreateBookingPayload {
  fieldId: number
  date: string
  slots: { startTime: string; endTime: string }[]
  paymentOption: PaymentOption
  note?: string
}

export interface CreateBookingResult {
  id: number
  status: string
  paymentStatus: string
  totalPrice: number
  depositAmount: number
  paidAmount: number
  checkInCode: string
  checkoutUrl: string
  qrCode: string
  payosOrderCode: number
}

export interface PaymentResultData {
  bookingId: number
  status: string
  paymentStatus: string
  totalPrice: number
  checkInCode: string
}
