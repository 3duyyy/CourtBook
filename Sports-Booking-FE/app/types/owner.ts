export type OwnerSidebarKey = "overview" | "facilities" | "calendar" | "revenue" | "checkin" | "reviews"

// Tab dashboard
export type OwnerOverviewStatKey = "todayBookings" | "monthlyRevenue" | "newCustomers" | "completedBookings"

export interface OwnerStatItem {
  key: string
  title: string
  value: string | number
  subtitle?: string
  changeText?: string
  icon: string
}

export type OwnerBookingStatus = "confirmed" | "pending" | "cancelled" | "completed"

export interface OwnerRecentBookingItem {
  id: string
  customerName: string
  fieldName: string
  sportName: string
  timeLabel: string
  status: OwnerBookingStatus
}

export interface OwnerScheduleItem {
  id: string
  time: string
  title: string
  description: string
  status: "success" | "warning" | "neutral"
}

export interface OwnerOverviewData {
  stats: OwnerStatItem[]
  recentBookings: OwnerRecentBookingItem[]
  todaySchedule: OwnerScheduleItem[]
}

export interface OwnerOverviewStatApiItem {
  key: OwnerOverviewStatKey
  value: number
  changePercent: number | null
}

export interface OwnerPaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface OwnerOverviewQueryParams {
  date?: string
  recentPage?: number
  recentLimit?: number
  scheduleLimit?: number
}

export interface OwnerOverviewPayload {
  stats: OwnerOverviewStatApiItem[]
  recentBookings: OwnerRecentBookingItem[]
  recentPagination: OwnerPaginationMeta
  todaySchedule: OwnerScheduleItem[]
}

// Tab facilities
export type OwnerFacilityStatus = "pending_approve" | "active" | "inactive"
export type OwnerFieldStatus = "active" | "maintenance" | "inactive"

export interface OwnerFieldItem {
  id: number
  name: string
  status: OwnerFieldStatus
  priceFrom: number
}

export interface OwnerFacilityItem {
  id: number
  name: string
  status: OwnerFacilityStatus
  sportName: string
  address: string
  district: string
  city: string
  openTime: string
  closeTime: string
  fieldsCount: number
  fields: OwnerFieldItem[]
}

export interface OwnerFacilitiesQueryParams {
  page?: number
  limit?: number
  keyword?: string
  status?: OwnerFacilityStatus
}

export interface OwnerFacilitiesListPayload {
  success: boolean
  data: OwnerFacilityItem[]
  pagination: OwnerPaginationMeta
}

// Check-in
export interface OwnerCheckInBookingItem {
  id: number
  bookingCode: string
  customerName: string
  customerPhone: string
  fieldName: string
  bookingDate: string
  timeLabel: string
  totalAmount: number
  depositAmount: number
  remainingAmount: number
  paymentStatus: "unpaid" | "paid" | "partially_paid" | "refunded"
  isCheckedIn: boolean
}

export interface OwnerCheckInHistoryItem {
  id: number
  checkedInTime: string
  customerName: string
  fieldName: string
  status: "checked_in"
}

export interface OwnerCheckInHistoryQueryParams {
  date?: string
  page?: number
  limit?: number
}

export interface OwnerCheckInSearchQueryParams {
  keyword: string
}

export interface OwnerCompleteCheckInPayload {
  collectedRemaining: boolean
}

export interface OwnerCheckInHistoryPayload {
  data: OwnerCheckInHistoryItem[]
  pagination: OwnerPaginationMeta
}

// Calendar
export interface OwnerCalendarFacilityFilterItem {
  id: number
  name: string
}

export type OwnerCalendarEventStatus = "confirmed" | "pending" | "maintenance" | "completed" | "cancelled"

export interface OwnerCalendarEventItem {
  id: string
  title: string
  facilityId: number
  facilityName: string
  fieldName: string
  start: string
  end: string
  status: OwnerCalendarEventStatus
  customerName?: string
}

export interface OwnerCalendarQueryParams {
  from: string
  to: string
}

export interface OwnerCalendarPayload {
  facilities: OwnerCalendarFacilityFilterItem[]
  events: OwnerCalendarEventItem[]
}

// CRUD popup types
export interface OwnerUtilityItem {
  id: number
  name: string
  iconClass?: string | null
}

export interface OwnerFieldPricingItem {
  id: number
  startTime: string
  endTime: string
  pricePerHour: number
  isWeekend: boolean
}

export interface OwnerFieldDetailItem {
  id: number
  name: string
  description: string
  status: OwnerFieldStatus
  pricings: OwnerFieldPricingItem[]
}

export interface OwnerFacilityDetailItem {
  id: number
  name: string
  description: string
  sportId: number
  sportName: string
  status: OwnerFacilityStatus
  address: string
  district: string
  city: string
  latitude: number | null
  longitude: number | null
  openTime: string
  closeTime: string
  images: Array<{ id: number; imageUrl: string; isThumbnail: boolean }>
  utilities: OwnerUtilityItem[]
  fields: OwnerFieldDetailItem[]
}

export interface OwnerFacilityUpsertPayload {
  name?: string
  description?: string
  sportId?: number
  address?: string
  district?: string
  city?: string
  latitude?: number
  longitude?: number
  openTime?: string
  closeTime?: string
  images?: string[]
  utilityIds?: number[]
}

export interface OwnerFieldUpsertPayload {
  name?: string
  description?: string
  status?: OwnerFieldStatus
}

export interface OwnerFieldCreatePayload {
  name: string
  description?: string
}

export interface OwnerSetFieldPricesPayload {
  pricings: Array<{
    startTime: string
    endTime: string
    pricePerHour: number
    isWeekend?: boolean
  }>
}
