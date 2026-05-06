export interface CanReviewResponse {
  canReview: boolean
  reviewableBookings: Array<{
    id: number
    startTime: string
    endTime: string
    field: { name: string }
  }>
}
