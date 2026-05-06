import type {
  FacilityAvailabilityResponse,
  FacilityDetailData,
  FacilityDetailField,
  FacilityDetailResponse,
  FacilityDetailReview,
  FacilityItem,
  FacilityReviewsResponse,
  PublicFacilityQueryParams,
  SearchFacilitiesResponse,
} from "~/types/facility"
import { axiosInstance } from "./axiosInstance"
import type { ApiResponse } from "~/types/common"
import type {
  OwnerCalendarPayload,
  OwnerCalendarQueryParams,
  OwnerCheckInBookingItem,
  OwnerCheckInHistoryPayload,
  OwnerCheckInHistoryQueryParams,
  OwnerCheckInSearchQueryParams,
  OwnerCompleteCheckInPayload,
  OwnerFacilitiesListPayload,
  OwnerFacilitiesQueryParams,
  OwnerFacilityDetailItem,
  OwnerFacilityUpsertPayload,
  OwnerFieldCreatePayload,
  OwnerFieldDetailItem,
  OwnerFieldPricingItem,
  OwnerFieldUpsertPayload,
  OwnerOverviewPayload,
  OwnerOverviewQueryParams,
  OwnerSetFieldPricesPayload,
} from "~/types/owner"

export const facilityService = {
  getPublicFacilities(query: PublicFacilityQueryParams) {
    return axiosInstance.get<SearchFacilitiesResponse>("/facilities", { params: query })
  },

  async getFeaturedFacilities(): Promise<FacilityItem[]> {
    const res = await axiosInstance.get<ApiResponse<FacilityItem[]>>("/facilities/featured")
    return res.data.data
  },

  async getFacilityDetail(id: number): Promise<FacilityDetailData> {
    const response = await axiosInstance.get<FacilityDetailResponse>(`/facilities/${id}`)
    const raw = response.data.data

    return {
      id: raw.id,
      name: raw.name,
      sportName: raw.sport?.name || "",
      address: raw.address,
      district: raw.district || "",
      city: raw.city || "",
      latitude: raw.latitude,
      longitude: raw.longitude,
      rating: raw.avgRating || 0,
      reviewCount: raw.reviewCount || 0,
      description: raw.description || "",
      images: raw.facilityImages.map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        isThumbnail: img.isThumbnail,
      })),
      amenities: (raw.facilityUtilities || [])
        .filter((item) => item.utility)
        .map((item) => ({
          id: item.utility!.id,
          name: item.utility!.name,
          icon: item.utility!.iconClass || undefined,
        })),
      fields: [],
      reviews: [],
    }
  },

  async getFacilityAvailability(id: number, date: string): Promise<FacilityDetailField[]> {
    const response = await axiosInstance.get<FacilityAvailabilityResponse>(`/facilities/${id}/availability`, {
      params: { date },
    })

    return response.data.data.map((field) => ({
      id: field.id,
      name: field.name,
      description: field.description || undefined,
      fromPrice: Number(field.fromPrice),
      slots: field.slots.map((slot) => ({
        id: `${field.id}-${slot.startTime}`,
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: Number(slot.pricePerHour),
        isBooked: slot.status !== "available",
      })),
    }))
  },

  async getFacilityReviews(id: number, page = 1, limit = 10): Promise<FacilityDetailReview[]> {
    const response = await axiosInstance.get<FacilityReviewsResponse>(`/facilities/${id}/reviews`, {
      params: { page, limit },
    })

    return response.data.data.map((review) => ({
      id: review.id,
      userId: review.user.id,
      userName: review.user.fullName,
      avatarUrl: review.user.avatarUrl,
      rating: review.rating,
      comment: review.comment || "",
      createdAt: review.createdAt,
      ownerReply: review.ownerReply || null,
      ownerReplyAt: review.ownerReplyAt || null,
    }))
  },

  // Private route
  getOwnerOverview(params?: OwnerOverviewQueryParams) {
    return axiosInstance.get<ApiResponse<OwnerOverviewPayload>>("/owner/overview", { params })
  },

  getOwnerFacilities(params: OwnerFacilitiesQueryParams) {
    return axiosInstance.get<OwnerFacilitiesListPayload>("/owner/facilities", { params })
  },

  getOwnerCalendar(params: OwnerCalendarQueryParams) {
    return axiosInstance.get<ApiResponse<OwnerCalendarPayload>>("/owner/calendar", { params })
  },

  getOwnerCheckInHistory(params?: OwnerCheckInHistoryQueryParams) {
    return axiosInstance.get<{
      success: boolean
      data: OwnerCheckInHistoryPayload["data"]
      pagination: OwnerCheckInHistoryPayload["pagination"]
    }>("/owner/check-in/history", { params })
  },

  searchOwnerCheckInBooking(params: OwnerCheckInSearchQueryParams) {
    return axiosInstance.get<ApiResponse<OwnerCheckInBookingItem | null>>("/owner/check-in/search", { params })
  },

  completeOwnerCheckIn(bookingId: number, payload: OwnerCompleteCheckInPayload) {
    return axiosInstance.patch<ApiResponse<OwnerCheckInBookingItem>>(`/owner/check-in/${bookingId}/complete`, payload)
  },

  getOwnerFacilityDetail(facilityId: number) {
    return axiosInstance.get<ApiResponse<OwnerFacilityDetailItem>>(`/owner/facilities/${facilityId}`)
  },

  createOwnerFacility(payload: OwnerFacilityUpsertPayload) {
    return axiosInstance.post<ApiResponse<OwnerFacilityDetailItem>>("/owner/facilities", payload)
  },

  updateOwnerFacility(facilityId: number, payload: OwnerFacilityUpsertPayload) {
    return axiosInstance.patch<ApiResponse<OwnerFacilityDetailItem>>(`/owner/facilities/${facilityId}`, payload)
  },

  deleteOwnerFacility(facilityId: number) {
    return axiosInstance.delete<ApiResponse<null>>(`/owner/facilities/${facilityId}`)
  },

  createOwnerField(facilityId: number, payload: OwnerFieldCreatePayload) {
    return axiosInstance.post<ApiResponse<OwnerFieldDetailItem>>(`/owner/facilities/${facilityId}/fields`, payload)
  },

  updateOwnerField(fieldId: number, payload: OwnerFieldUpsertPayload) {
    return axiosInstance.patch<ApiResponse<OwnerFieldDetailItem>>(`/owner/fields/${fieldId}`, payload)
  },

  deleteOwnerField(fieldId: number) {
    return axiosInstance.delete<ApiResponse<null>>(`/owner/fields/${fieldId}`)
  },

  getOwnerFieldPrices(fieldId: number) {
    return axiosInstance.get<ApiResponse<OwnerFieldPricingItem[]>>(`/owner/fields/${fieldId}/prices`)
  },

  setOwnerFieldPrices(fieldId: number, payload: OwnerSetFieldPricesPayload) {
    return axiosInstance.put<ApiResponse<OwnerFieldPricingItem[]>>(`/owner/fields/${fieldId}/prices`, payload)
  },
}
