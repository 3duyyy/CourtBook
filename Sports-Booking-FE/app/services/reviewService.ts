import type { ApiResponse } from "~/types/common"
import { axiosInstance } from "./axiosInstance"
import type { CanReviewResponse } from "~/types/review"

export const reviewService = {
  createReview(data: { bookingId: number; rating: number; comment?: string }) {
    return axiosInstance.post("/reviews", data)
  },
  checkCanReview(facilityId: number) {
    return axiosInstance.get<ApiResponse<CanReviewResponse>>("/reviews/can-review", {
      params: { facilityId },
    })
  },
  getOwnerReviews(params: { facilityId: number; page?: number; limit?: number }) {
    return axiosInstance.get("/owner/reviews", { params })
  },
  ownerReplyReview(reviewId: number, reply: string) {
    return axiosInstance.post(`/owner/reviews/${reviewId}/reply`, { reply })
  },
  deleteOwnReview(reviewId: number) {
    return axiosInstance.delete(`/reviews/${reviewId}`)
  },
  ownerDeleteReview(reviewId: number) {
    return axiosInstance.delete(`/owner/reviews/${reviewId}`)
  },
  deleteOwnerReplyReview(reviewId: number) {
    return axiosInstance.delete(`/reviews/reviews/${reviewId}/reply`)
  },
}
