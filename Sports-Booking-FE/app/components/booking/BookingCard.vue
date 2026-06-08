<script setup lang="ts">
import dayjs from "dayjs"
import { mdiCalendarMonthOutline, mdiClockOutline, mdiMapMarkerOutline, mdiCloseCircleOutline } from "@mdi/js"
import type { CustomerBookingItem } from "~/types/booking"

const props = defineProps<{
  booking: CustomerBookingItem
}>()

const emit = defineEmits<{
  (e: "cancel-request", payload: { bookingId: number; bookingCode: string }): void
}>()

const formatPrice = (value: number) => {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`
}

const paymentConfig = computed(() => {
  switch (props.booking.paymentBadge) {
    case "Đã cọc":
      return {
        color: "warning",
        text: "Đã cọc",
      }
    case "Đã thanh toán":
      return {
        color: "success",
        text: "Đã thanh toán",
      }
    case "Chờ xác nhận":
      return {
        color: "info",
        text: "Chờ xác nhận",
      }
    case "Chờ thanh toán":
      return {
        color: "grey",
        text: "Chờ thanh toán",
      }
    case "Đã hoàn tiền":
      return {
        color: "secondary",
        text: "Đã hoàn tiền",
      }
    case "Thanh toán một phần":
      return {
        color: "warning",
        text: "Thanh toán một phần",
      }
    default:
      return {
        color: "default",
        text: props.booking.paymentBadge,
      }
  }
})

const showCancelButton = computed(() => {
  return props.booking.tab === "pending_confirmation" || props.booking.tab === "upcoming"
})

const isWithinTwoHours = computed(() => {
  const startAt = dayjs(`${props.booking.bookingDate} ${props.booking.startTime}`, "DD/MM/YYYY HH:mm", true)
  if (!startAt.isValid()) return false

  const diffMs = startAt.diff(dayjs())
  return diffMs <= 2 * 60 * 60 * 1000
})

const isCancelDisabled = computed(() => {
  if (!showCancelButton.value) return false
  if (props.booking.canCancel === false) return true
  return isWithinTwoHours.value
})

const cancelTooltip = computed(() => {
  if (!isCancelDisabled.value) return ""
  if (props.booking.cancelBlockedReason) return props.booking.cancelBlockedReason
  if (isWithinTwoHours.value) return "Không thể hủy lịch trong vòng 2 tiếng trước giờ bắt đầu"
  return "Lịch đặt này hiện không thể hủy"
})

const handleCancelRequest = () => {
  if (isCancelDisabled.value) return

  emit("cancel-request", {
    bookingId: props.booking.id,
    bookingCode: props.booking.bookingCode,
  })
}
</script>

<template>
  <v-card rounded="xl" elevation="0" class="border border-slate-200 overflow-hidden">
    <v-row no-gutters>
      <v-col cols="12" md="3">
        <v-img :src="booking.facilityImage" height="100%" min-height="220" cover />
      </v-col>

      <v-col cols="12" md="9">
        <div class="pa-4 pa-sm-5">
          <div class="d-flex flex-column flex-md-row justify-space-between ga-4">
            <div class="flex-1-1">
              <div class="d-flex align-center flex-wrap ga-2 mb-3">
                <v-chip size="small" color="success" variant="tonal">
                  {{ booking.sportName }}
                </v-chip>

                <v-chip size="small" :color="paymentConfig.color" variant="tonal">
                  {{ paymentConfig.text }}
                </v-chip>
              </div>

              <div class="text-h5 font-weight-bold text-slate-900 mb-2">
                {{ booking.fieldName }}
              </div>

              <div class="text-subtitle-1 font-weight-medium text-slate-700 mb-2">
                {{ booking.facilityName }}
              </div>

              <div class="d-flex align-start ga-2 text-medium-emphasis">
                <v-icon :icon="mdiMapMarkerOutline" size="18" class="mt-1" />
                <span>{{ booking.facilityAddress }}</span>
              </div>
            </div>

            <div class="text-md-right">
              <div class="text-h4 font-weight-bold text-slate-900">
                {{ formatPrice(booking.totalPrice) }}
              </div>
              <div class="text-body-2 text-medium-emphasis">Tổng tiền</div>
            </div>
          </div>

          <v-divider class="my-4" />

          <v-row dense>
            <v-col cols="12" md="3">
              <v-sheet rounded="lg" color="grey-lighten-4" class="pa-4 h-100">
                <div class="d-flex align-start ga-3">
                  <v-icon :icon="mdiCalendarMonthOutline" size="20" />
                  <div>
                    <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-1">Ngày đặt</div>
                    <div class="text-body-1 font-weight-bold">
                      {{ booking.bookingDate }}
                    </div>
                  </div>
                </div>
              </v-sheet>
            </v-col>

            <v-col cols="12" md="3">
              <v-sheet rounded="lg" color="grey-lighten-4" class="pa-4 h-100">
                <div class="d-flex align-start ga-3">
                  <v-icon :icon="mdiClockOutline" size="20" />
                  <div>
                    <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-1">Khung giờ</div>
                    <div class="text-body-1 font-weight-bold">{{ booking.startTime }} - {{ booking.endTime }}</div>
                  </div>
                </div>
              </v-sheet>
            </v-col>

            <v-col cols="12" md="3">
              <v-sheet rounded="lg" color="grey-lighten-4" class="pa-4 h-100">
                <div>
                  <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-1">Mã Check-in</div>
                  <div class="text-body-1 font-weight-bold font-mono text-success">
                    {{ booking.checkInCode || "---" }}
                  </div>
                </div>
              </v-sheet>
            </v-col>

            <v-col cols="12" md="3">
              <v-sheet rounded="lg" color="grey-lighten-4" class="pa-4 h-100">
                <div>
                  <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis mb-1">Ghi chú</div>
                  <div class="text-body-2 font-weight-medium">
                    {{ booking.paymentNote || "-" }}
                  </div>
                </div>
              </v-sheet>
            </v-col>
          </v-row>

          <v-alert
            v-if="booking.remainingAmount && booking.remainingAmount > 0"
            class="mt-4"
            rounded="lg"
            variant="tonal"
            color="success"
          >
            <div class="d-flex align-center justify-space-between ga-3 flex-wrap">
              <span class="text-body-1 text-slate-700"> Số tiền còn lại cần thanh toán </span>

              <span class="text-h6 font-weight-bold text-slate-900">
                {{ formatPrice(booking.remainingAmount) }}
              </span>
            </div>
          </v-alert>

          <div class="d-flex flex-wrap justify-end ga-3 mt-4">
            <!-- <v-btn v-if="booking.canViewDetail" variant="outlined" rounded="lg" class="text-none">
              <template #prepend>
                <v-icon :icon="mdiFileDocumentOutline" size="18" />
              </template>
              Xem chi tiết
            </v-btn> -->

            <v-btn v-if="booking.canViewReceipt" color="success" variant="outlined" rounded="lg" class="text-none">
              Xem hóa đơn
            </v-btn>

            <v-tooltip v-if="showCancelButton" :disabled="!isCancelDisabled" :text="cancelTooltip" location="top">
              <template #activator="{ props: tooltipProps }">
                <span v-bind="tooltipProps" class="d-inline-block">
                  <v-btn
                    color="error"
                    variant="flat"
                    rounded="lg"
                    class="text-none"
                    :disabled="isCancelDisabled"
                    @click="handleCancelRequest"
                  >
                    <template #prepend>
                      <v-icon :icon="mdiCloseCircleOutline" size="18" />
                    </template>
                    Hủy lịch đặt
                  </v-btn>
                </span>
              </template>
            </v-tooltip>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>
