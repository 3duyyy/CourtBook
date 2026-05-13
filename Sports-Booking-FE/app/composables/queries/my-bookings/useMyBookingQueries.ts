import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { toast } from "vue-sonner"
import { bookingService } from "~/services/bookingService"
import type {
  CancelMyBookingPayload,
  CreateBookingPayload,
  MyBookingsListApiResponse,
  MyBookingsQueryParams,
} from "~/types/booking"

export const myBookingsQueryKeys = {
  all: ["my-bookings"] as const,
  list: (params: { page: number; limit: number; tab: "all" | "pending_confirmation" | "upcoming" | "completed" | "cancelled" }) =>
    [...myBookingsQueryKeys.all, "list", params] as const,
}

export function useMyBookingsQuery(params: MaybeRef<MyBookingsQueryParams>) {
  return useQuery<MyBookingsListApiResponse>({
    queryKey: computed(() =>
      myBookingsQueryKeys.list({
        page: unref(params).page ?? 1,
        limit: unref(params).limit ?? 10,
        tab: unref(params).tab ?? "all",
      }),
    ),
    queryFn: async () => {
      const response = await bookingService.getMyBookings({
        page: unref(params).page ?? 1,
        limit: unref(params).limit ?? 10,
        tab: unref(params).tab ?? "all",
      })
      return response.data
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  })
}

export function useCancelMyBookingMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { bookingId: number; data?: CancelMyBookingPayload }) => {
      const response = await bookingService.cancelMyBooking(payload.bookingId, payload.data)
      return response.data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: myBookingsQueryKeys.all })
    },
  })
}

export function useCreateBookingMutation() {
  return useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const response = await bookingService.createBooking(payload)
      return response.data.data
    },
  })
}
