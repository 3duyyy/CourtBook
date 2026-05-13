<template>
  <div class="container-layout checkout-result-page">
    <v-container class="max-w-2xl py-12">
      <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="success" size="48" />
        <p class="mt-4 text-slate-500">Đang kiểm tra kết quả thanh toán...</p>
      </div>

      <v-card v-else-if="isCancelled" rounded="xl" elevation="3" class="pa-8 text-center">
        <v-icon :icon="mdiCloseCircleOutline" size="64" color="error" />
        <h2 class="text-2xl font-bold mt-4">Thanh toán đã bị hủy</h2>
        <p class="text-slate-500 mt-2">Bạn đã hủy quá trình thanh toán. Đơn đặt sân chưa được xác nhận.</p>
        <v-btn color="success" variant="flat" rounded="xl" class="mt-6 text-none px-8" @click="router.push('/search-facilities')">
          Tìm sân khác
        </v-btn>
      </v-card>

      <v-card v-else-if="paymentResult?.status === 'confirmed'" rounded="xl" elevation="3" class="pa-8 text-center">
        <v-icon :icon="mdiCheckCircleOutline" size="64" color="success" />
        <h2 class="text-2xl font-bold mt-4 text-green-700">Thanh toán thành công!</h2>
        <p class="text-slate-500 mt-2">Đơn đặt sân của bạn đã được xác nhận.</p>

        <v-card rounded="xl" class="mt-6 pa-4 bg-slate-50" variant="outlined">
          <div class="flex justify-between text-sm mb-2">
            <span class="text-slate-500">Mã booking</span>
            <span class="font-bold">#BK-{{ paymentResult.bookingId }}</span>
          </div>
          <div class="flex justify-between text-sm mb-2">
            <span class="text-slate-500">Mã check-in</span>
            <span class="font-bold font-mono">{{ paymentResult.checkInCode }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-500">Tổng tiền</span>
            <span class="font-bold">{{ formatPrice(paymentResult.totalPrice) }}</span>
          </div>
        </v-card>

        <div class="flex gap-3 justify-center mt-6">
          <v-btn color="success" variant="flat" rounded="xl" class="text-none px-6" @click="router.push('/my-bookings')">
            Xem lịch đặt
          </v-btn>
          <v-btn variant="outlined" rounded="xl" class="text-none px-6" @click="router.push('/search-facilities')">
            Đặt sân tiếp
          </v-btn>
        </div>
      </v-card>

      <v-card v-else rounded="xl" elevation="3" class="pa-8 text-center">
        <v-icon :icon="mdiAlertCircleOutline" size="64" color="warning" />
        <h2 class="text-2xl font-bold mt-4">Đang chờ xử lý</h2>
        <p class="text-slate-500 mt-2">Thanh toán chưa được xác nhận. Hệ thống sẽ tự động cập nhật khi nhận được kết quả.</p>
        <v-btn color="success" variant="flat" rounded="xl" class="mt-6 text-none px-8" @click="router.push('/my-bookings')">
          Xem lịch đặt của tôi
        </v-btn>
      </v-card>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { mdiCheckCircleOutline, mdiCloseCircleOutline, mdiAlertCircleOutline } from "@mdi/js"
import { bookingService } from "~/services/bookingService"
import { formatPrice } from "~/shared/utils"
import type { PaymentResultData } from "~/types/booking"

definePageMeta({ layout: "default" })

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const paymentResult = ref<PaymentResultData | null>(null)

const isCancelled = computed(() => route.query.cancelled === "true")

onMounted(async () => {
  if (isCancelled.value) {
    const orderCode = Number(route.query.orderCode) || Number(localStorage.getItem("payos_order_code"))

    if (orderCode) {
      try {
        await bookingService.cancelPayment(orderCode)
      } catch (error) {
        console.error(error)
      }

      localStorage.removeItem("payos_order_code")
    }

    loading.value = false
    return
  }

  const orderCode = Number(route.query.orderCode) || Number(localStorage.getItem("payos_order_code"))

  if (!orderCode) {
    loading.value = false
    return
  }

  try {
    const res = await bookingService.getPaymentResult(orderCode)
    paymentResult.value = res.data.data
  } catch {
    paymentResult.value = null
  } finally {
    loading.value = false
    localStorage.removeItem("payos_order_code")
  }
})
</script>

<style scoped>
.checkout-result-page {
  background: #f8fafc;
  min-height: calc(100vh - 64px);
}
</style>
