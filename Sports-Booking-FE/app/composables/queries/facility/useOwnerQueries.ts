import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { facilityService } from "~/services/facilityService"
import { reviewService } from "~/services/reviewService"
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
  OwnerFieldUpsertPayload,
  OwnerOverviewPayload,
  OwnerOverviewQueryParams,
  OwnerSetFieldPricesPayload,
} from "~/types/owner"

export const ownerOverviewQueryKeys = {
  all: ["owner"] as const,
  overview: (params: { date?: string; recentPage: number; recentLimit: number; scheduleLimit: number }) =>
    [...ownerOverviewQueryKeys.all, "overview", params] as const,
  facilities: (params: { page: number; limit: number; keyword: string; status?: "pending_approve" | "active" | "inactive" }) =>
    [...ownerOverviewQueryKeys.all, "facilities", params] as const,
  calendar: (params: { from: string; to: string }) => [...ownerOverviewQueryKeys.all, "calendar", params] as const,
  checkinHistory: (params: { date?: string; page: number; limit: number }) =>
    [...ownerOverviewQueryKeys.all, "checkin-history", params] as const,
  facilityDetail: (facilityId: number) => [...ownerOverviewQueryKeys.all, "facility-detail", facilityId] as const,
  reviews: (params: { facilityId: number | null; page: number; limit: number }) =>
    [...ownerOverviewQueryKeys.all, "reviews", params] as const,
}

export function useOwnerOverviewQuery(params: MaybeRef<OwnerOverviewQueryParams>, enabled: MaybeRef<boolean>) {
  return useQuery<OwnerOverviewPayload>({
    queryKey: computed(() =>
      ownerOverviewQueryKeys.overview({
        date: unref(params).date,
        recentPage: unref(params).recentPage ?? 1,
        recentLimit: unref(params).recentLimit ?? 5,
        scheduleLimit: unref(params).scheduleLimit ?? 8,
      }),
    ),
    enabled,
    queryFn: async () => {
      const response = await facilityService.getOwnerOverview({
        date: unref(params).date,
        recentLimit: unref(params).recentLimit ?? 5,
        scheduleLimit: unref(params).scheduleLimit ?? 8,
      })
      return response.data.data
    },
    staleTime: 30 * 1000,
    retry: 1,
  })
}

export function useOwnerFacilitiesQuery(params: MaybeRef<OwnerFacilitiesQueryParams>, enabled: MaybeRef<boolean>) {
  return useQuery<OwnerFacilitiesListPayload>({
    queryKey: computed(() =>
      ownerOverviewQueryKeys.facilities({
        page: unref(params).page ?? 1,
        limit: unref(params).limit ?? 5,
        keyword: unref(params).keyword?.trim() ?? "",
        ...(unref(params).status ? { status: unref(params).status } : {}),
      }),
    ),
    enabled,
    queryFn: async () => {
      const response = await facilityService.getOwnerFacilities({
        page: unref(params).page ?? 1,
        limit: unref(params).limit ?? 5,
        ...(unref(params).keyword?.trim() ? { keyword: unref(params).keyword?.trim() } : {}),
        ...(unref(params).status ? { status: unref(params).status } : {}),
      })
      return response.data
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  })
}

export function useOwnerCalendarQuery(params: MaybeRef<OwnerCalendarQueryParams>, enabled: MaybeRef<boolean>) {
  return useQuery<OwnerCalendarPayload>({
    queryKey: computed(() =>
      ownerOverviewQueryKeys.calendar({
        from: unref(params).from,
        to: unref(params).to,
      }),
    ),
    enabled,
    queryFn: async () => {
      const response = await facilityService.getOwnerCalendar({
        from: unref(params).from,
        to: unref(params).to,
      })
      return response.data.data
    },
    staleTime: 30 * 1000,
    retry: 1,
  })
}

export function useOwnerCheckInHistoryQuery(params: MaybeRef<OwnerCheckInHistoryQueryParams>, enabled: MaybeRef<boolean>) {
  return useQuery<OwnerCheckInHistoryPayload>({
    queryKey: computed(() =>
      ownerOverviewQueryKeys.checkinHistory({
        date: unref(params).date,
        page: unref(params).page ?? 1,
        limit: unref(params).limit ?? 20,
      }),
    ),
    enabled,
    queryFn: async () => {
      const response = await facilityService.getOwnerCheckInHistory({
        date: unref(params).date,
        page: unref(params).page ?? 1,
        limit: unref(params).limit ?? 20,
      })

      return {
        data: response.data.data,
        pagination: response.data.pagination,
      }
    },
    staleTime: 30 * 1000,
  })
}

export function useOwnerCheckInSearchMutation() {
  return useMutation<OwnerCheckInBookingItem | null, unknown, OwnerCheckInSearchQueryParams>({
    mutationFn: async (params) => {
      const response = await facilityService.searchOwnerCheckInBooking(params)
      return response.data.data
    },
  })
}

export function useOwnerCompleteCheckInMutation() {
  const queryClient = useQueryClient()

  return useMutation<OwnerCheckInBookingItem, unknown, { bookingId: number; payload: OwnerCompleteCheckInPayload }>({
    mutationFn: async ({ bookingId, payload }) => {
      const response = await facilityService.completeOwnerCheckIn(bookingId, payload)
      return response.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...ownerOverviewQueryKeys.all, "checkin-history"],
      })
    },
  })
}

export function useOwnerFacilityDetailQuery(facilityId: MaybeRef<number | null>, enabled: MaybeRef<boolean>) {
  return useQuery<OwnerFacilityDetailItem>({
    queryKey: computed(() => ownerOverviewQueryKeys.facilityDetail(unref(facilityId) ?? 0)),
    enabled: computed(() => Boolean(unref(enabled) && unref(facilityId))),
    queryFn: async () => {
      const response = await facilityService.getOwnerFacilityDetail(unref(facilityId)!)
      return response.data.data
    },
  })
}

export function useOwnerCreateFacilityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OwnerFacilityUpsertPayload) => facilityService.createOwnerFacility(payload).then((r) => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...ownerOverviewQueryKeys.all, "facilities"] }),
  })
}

export function useOwnerUpdateFacilityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ facilityId, payload }: { facilityId: number; payload: OwnerFacilityUpsertPayload }) =>
      facilityService.updateOwnerFacility(facilityId, payload).then((r) => r.data.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: [...ownerOverviewQueryKeys.all, "facilities"] })
      queryClient.invalidateQueries({ queryKey: ownerOverviewQueryKeys.facilityDetail(vars.facilityId) })
    },
  })
}

export function useOwnerDeleteFacilityMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (facilityId: number) => facilityService.deleteOwnerFacility(facilityId).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...ownerOverviewQueryKeys.all, "facilities"] }),
  })
}

export function useOwnerCreateFieldMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ facilityId, payload }: { facilityId: number; payload: OwnerFieldCreatePayload }) =>
      facilityService.createOwnerField(facilityId, payload).then((r) => r.data.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ownerOverviewQueryKeys.facilityDetail(vars.facilityId) })
      queryClient.invalidateQueries({ queryKey: [...ownerOverviewQueryKeys.all, "facilities"] })
    },
  })
}

export function useOwnerUpdateFieldMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ facilityId, fieldId, payload }: { facilityId: number; fieldId: number; payload: OwnerFieldUpsertPayload }) =>
      facilityService.updateOwnerField(fieldId, payload).then((r) => r.data.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ownerOverviewQueryKeys.facilityDetail(vars.facilityId) })
    },
  })
}

export function useOwnerDeleteFieldMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ facilityId, fieldId }: { facilityId: number; fieldId: number }) =>
      facilityService.deleteOwnerField(fieldId).then((r) => r.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ownerOverviewQueryKeys.facilityDetail(vars.facilityId) })
      queryClient.invalidateQueries({ queryKey: [...ownerOverviewQueryKeys.all, "facilities"] })
    },
  })
}

export function useOwnerSetFieldPricesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      facilityId,
      fieldId,
      payload,
    }: {
      facilityId: number
      fieldId: number
      payload: OwnerSetFieldPricesPayload
    }) => facilityService.setOwnerFieldPrices(fieldId, payload).then((r) => r.data.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ownerOverviewQueryKeys.facilityDetail(vars.facilityId) })
    },
  })
}

// ==========Reviews==========
export function useOwnerReviewsQuery(
  params: MaybeRef<{ facilityId: number | null; page: number; limit: number }>,
  enabled: MaybeRef<boolean>,
) {
  return useQuery({
    queryKey: computed(() => ownerOverviewQueryKeys.reviews(unref(params))),
    enabled: computed(() => Boolean(unref(enabled) && unref(params).facilityId)),
    queryFn: async () => {
      const p = unref(params)
      const res = await reviewService.getOwnerReviews({
        facilityId: p.facilityId!,
        page: p.page,
        limit: p.limit,
      })
      return { data: res.data.data, pagination: res.data.pagination }
    },
    staleTime: 30 * 1000,
  })
}

export function useOwnerReplyReviewMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: number; reply: string }) => reviewService.ownerReplyReview(reviewId, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ownerOverviewQueryKeys.all, "reviews"] })
    },
  })
}

export function useOwnerDeleteReviewMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: number) => reviewService.ownerDeleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ownerOverviewQueryKeys.all, "reviews"] })
    },
  })
}

export function useOwnerDeleteReplyReviewMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reviewId: number) => reviewService.deleteOwnerReplyReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ownerOverviewQueryKeys.all, "reviews"] })
    },
  })
}
