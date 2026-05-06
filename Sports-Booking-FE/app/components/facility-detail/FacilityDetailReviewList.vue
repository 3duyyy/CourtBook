<template>
  <v-card rounded="xl" elevation="2" class="pa-5">
    <div class="flex items-center gap-4 mb-5">
      <h3 class="text-lg font-bold">Đánh giá ({{ reviews.length }})</h3>
    </div>

    <div v-if="isAuthenticated" class="mb-5">
      <v-tooltip v-if="!canReviewData?.canReview" location="top" text="Bạn cần đặt sân và hoàn thành booking trước khi đánh giá">
        <template #activator="{ props: tooltipProps }">
          <div v-bind="tooltipProps" style="display: inline-block">
            <v-btn color="success" variant="flat" disabled rounded="lg" class="text-none"> Viết đánh giá </v-btn>
          </div>
        </template>
      </v-tooltip>
      <v-btn v-else color="success" variant="flat" rounded="lg" class="text-none" @click="showForm = true"> Viết đánh giá </v-btn>
    </div>

    <v-dialog v-model="showForm" max-width="500" persistent>
      <v-card rounded="xl" class="pa-5">
        <h3 class="text-lg font-bold mb-4">Đánh giá của bạn</h3>

        <p class="text-sm text-slate-500 mb-2">Chất lượng dịch vụ</p>
        <v-rating v-model="newRating" color="amber" active-color="amber" size="36" class="mb-4" />

        <v-select
          v-model="selectedBookingId"
          :items="bookingOptions"
          item-title="label"
          item-value="value"
          label="Chọn lượt đặt sân"
          variant="outlined"
          rounded="lg"
          class="mb-2"
        />

        <v-textarea
          v-model="newComment"
          label="Nhận xét của bạn (tuỳ chọn)"
          variant="outlined"
          rows="3"
          rounded="lg"
          counter="500"
          maxlength="500"
        />

        <v-card-actions class="justify-end px-0">
          <v-btn variant="text" class="text-none" @click="resetForm">Hủy</v-btn>
          <v-btn
            color="success"
            variant="flat"
            class="text-none"
            :loading="submitting"
            :disabled="!selectedBookingId || newRating === 0"
            @click="submitReview"
          >
            Gửi đánh giá
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <div class="space-y-4">
      <div v-for="review in reviews" :key="review.id" class="rounded-2xl border border-slate-200 p-4">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3">
            <v-avatar size="42" color="success">
              <span class="text-sm font-bold text-white">{{ getInitials(review.userName) }}</span>
            </v-avatar>
            <div>
              <p class="font-semibold mb-0">{{ review.userName }}</p>
              <p class="text-[13px] text-slate-500 mt-0">{{ formatDate(review.createdAt) }}</p>
            </div>
          </div>

          <div class="flex flex-col items-end gap-3">
            <v-rating :model-value="review.rating" readonly density="compact" size="18" color="amber" class="d-flex ga-1" />

            <v-btn
              v-if="review.userId === currentUserId"
              size="x-small"
              variant="text"
              color="error"
              class="text-none"
              @click="openDeleteConfirm(review.id)"
            >
              Xóa đánh giá
            </v-btn>
          </div>
        </div>

        <p class="mt-3 text-body-2 text-slate-600">{{ review.comment }}</p>

        <div v-if="review.ownerReply" class="mt-3 ml-12 p-3 bg-green-50 rounded-xl border border-green-100">
          <p class="text-sm font-semibold text-green-800 mb-1">Phản hồi từ chủ sân:</p>
          <p class="text-sm text-slate-700">{{ review.ownerReply }}</p>
          <p v-if="review.ownerReplyAt" class="text-xs text-slate-400 mt-1">{{ formatDate(review.ownerReplyAt) }}</p>
        </div>
      </div>
    </div>

    <div v-if="reviews.length === 0" class="text-center py-8 text-slate-400">Chưa có đánh giá nào</div>

    <confirm-dialog
      v-model="deleteConfirmOpen"
      title="Xóa đánh giá"
      message="Bạn có chắc chắn muốn xóa đánh giá này không? Hành động này không thể hoàn tác."
      confirm-text="Xóa đánh giá"
      cancel-text="Hủy"
      confirm-color="error"
      :is-loading="deleting"
      @confirm="handleDeleteConfirm"
    />
  </v-card>
</template>

<script setup lang="ts">
import type { FacilityDetailReview } from "~/types/facility"
import { reviewService } from "~/services/reviewService"
import ConfirmDialog from "../common/ConfirmDialog.vue"

const props = defineProps<{
  reviews: FacilityDetailReview[]
  facilityId: number
}>()

const emit = defineEmits<{ (e: "review-created"): void }>()

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const currentUserId = computed(() => authStore.user?.id)

// Check quyền review
const canReviewData = ref<{ canReview: boolean; reviewableBookings: any[] } | null>(null)
const showForm = ref(false)
const newRating = ref(0)
const newComment = ref("")
const selectedBookingId = ref<number | null>(null)
const submitting = ref(false)

const deleteConfirmOpen = ref(false)
const reviewIdToDelete = ref<number | null>(null)
const deleting = ref(false)

const bookingOptions = computed(() => {
  if (!canReviewData.value) return []
  return canReviewData.value.reviewableBookings.map((b) => ({
    label: `${b.field.name} — ${new Date(b.startTime).toLocaleDateString("vi-VN")}`,
    value: b.id,
  }))
})

// Gọi API check quyền khi component mount
onMounted(async () => {
  if (!isAuthenticated.value) return
  try {
    const res = await reviewService.checkCanReview(props.facilityId)
    canReviewData.value = res.data.data
  } catch {
    canReviewData.value = { canReview: false, reviewableBookings: [] }
  }
})

async function submitReview() {
  if (!selectedBookingId.value || newRating.value === 0) return
  submitting.value = true
  try {
    await reviewService.createReview({
      bookingId: selectedBookingId.value,
      rating: newRating.value,
      comment: newComment.value || undefined,
    })
    resetForm()
    emit("review-created")
  } catch (err: any) {
    alert(err.response?.data?.message || "Có lỗi xảy ra")
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  showForm.value = false
  newRating.value = 0
  newComment.value = ""
  selectedBookingId.value = null
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join("")
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value))
}

function openDeleteConfirm(reviewId: number) {
  reviewIdToDelete.value = reviewId
  deleteConfirmOpen.value = true
}

async function handleDeleteConfirm() {
  if (!reviewIdToDelete.value) return
  deleting.value = true
  try {
    await reviewService.deleteOwnReview(reviewIdToDelete.value)
    emit("review-created")
    deleteConfirmOpen.value = false
  } catch (err: any) {
    alert(err.response?.data?.message || "Có lỗi xảy ra")
  } finally {
    deleting.value = false
    reviewIdToDelete.value = null
  }
}
</script>
