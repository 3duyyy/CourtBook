<template>
  <v-card rounded="xl" class="border border-slate-200 shadow-sm">
    <div class="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg font-bold text-slate-900">Đánh giá</h2>

      <v-select
        v-model="selectedFacilityId"
        :items="facilityOptions"
        item-title="name"
        item-value="id"
        label="Chọn cơ sở"
        variant="outlined"
        density="compact"
        rounded="lg"
        hide-details
        style="max-width: 300px"
      />
    </div>

    <v-divider />

    <div v-if="loading" class="pa-8 text-center">
      <v-progress-circular indeterminate color="success" />
    </div>

    <div v-else-if="!selectedFacilityId" class="pa-8 text-center text-slate-400">Vui lòng chọn cơ sở để xem đánh giá</div>

    <div v-else-if="reviews.length === 0" class="pa-8 text-center text-slate-400">Chưa có đánh giá nào cho cơ sở này</div>

    <div v-else class="pa-5 space-y-4">
      <div v-for="review in reviews" :key="review.id" class="rounded-xl border border-slate-200 p-4">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-3">
            <v-avatar size="36" color="success">
              <span class="text-white text-xs font-bold">{{ initials(review.user.fullName) }}</span>
            </v-avatar>
            <div>
              <p class="font-semibold text-sm mb-0">{{ review.user.fullName }}</p>
              <p class="text-xs text-slate-400 mt-0">{{ review.booking?.field?.name }} · {{ formatDate(review.createdAt) }}</p>
            </div>
          </div>
          <v-rating :model-value="review.rating" readonly size="16" density="compact" color="amber" class="d-flex ga-1" />
        </div>

        <p v-if="review.comment" class="mt-2 text-sm text-slate-600">{{ review.comment }}</p>

        <div v-if="review.ownerReply" class="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
          <p class="text-sm font-semibold text-green-800 mb-1">Phản hồi của bạn:</p>
          <p class="text-sm text-slate-700">{{ review.ownerReply }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ formatDate(review.ownerReplyAt) }}</p>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <template v-if="!review.ownerReply">
            <v-btn
              v-if="replyingId !== review.id"
              size="small"
              variant="outlined"
              color="success"
              class="text-none"
              @click="startReply(review.id)"
            >
              Phản hồi
            </v-btn>

            <div v-else class="flex w-full gap-2 items-start">
              <v-textarea
                v-model="replyText"
                rows="2"
                variant="outlined"
                density="compact"
                hide-details
                placeholder="Nhập phản hồi..."
                class="flex-1"
              />

              <div class="flex flex-col gap-1">
                <v-btn
                  size="small"
                  color="success"
                  variant="flat"
                  :loading="pending"
                  class="text-none"
                  @click="submitReply(review.id)"
                >
                  Gửi
                </v-btn>
                <v-btn size="small" variant="text" class="text-none" @click="replyingId = null">Hủy</v-btn>
              </div>
            </div>
          </template>

          <v-btn
            v-if="review.ownerReply"
            size="small"
            variant="text"
            color="warning"
            class="text-none px-2"
            :loading="deletingReplyPending"
            @click="handleDeleteReply(review.id)"
          >
            Xóa phản hồi
          </v-btn>

          <v-spacer v-if="replyingId !== review.id" />

          <v-btn
            v-if="replyingId !== review.id"
            size="small"
            variant="outlined"
            color="error"
            class="text-none"
            @click="handleDelete(review.id)"
          >
            Xóa đánh giá
          </v-btn>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex justify-center pt-4">
        <v-pagination v-model="page" :length="totalPages" rounded="lg" color="success" />
      </div>
    </div>

    <confirm-dialog
      v-model="deleteConfirmOpen"
      title="Xóa đánh giá"
      message="Bạn có chắc chắn muốn xóa đánh giá của khách hàng này không?"
      confirm-text="Xóa"
      cancel-text="Hủy"
      confirm-color="error"
      :is-loading="downloadPending"
      @confirm="handleDeleteConfirm"
    />

    <confirm-dialog
      v-model="deleteReplyConfirmOpen"
      title="Xóa phản hồi"
      message="Bạn có chắc chắn muốn xóa phản hồi của mình cho đánh giá này không?"
      confirm-text="Xóa phản hồi"
      cancel-text="Hủy"
      confirm-color="error"
      :is-loading="deletingReplyPending"
      @confirm="handleDeleteReplyConfirm"
    />
  </v-card>
</template>

<script setup lang="ts">
import {
  useOwnerDeleteReplyReviewMutation,
  useOwnerDeleteReviewMutation,
  useOwnerReplyReviewMutation,
  useOwnerReviewsQuery,
} from "~/composables/queries/facility/useOwnerQueries"
import ConfirmDialog from "../common/ConfirmDialog.vue"
import { toast } from "vue-sonner"

const props = defineProps<{
  facilityOptions: Array<{ id: number; name: string }>
}>()

const selectedFacilityId = ref<number | null>(null)
const page = ref(1)

const replyingId = ref<number | null>(null)
const replyText = ref("")

const deleteConfirmOpen = ref(false)
const reviewIdToDelete = ref<number | null>(null)
const deleteReplyConfirmOpen = ref(false)
const replyIdToDelete = ref<number | null>(null)

const queryParams = computed(() => ({
  facilityId: selectedFacilityId.value,
  page: page.value,
  limit: 10,
}))

const { data: reviewsData, isLoading: loading } = useOwnerReviewsQuery(
  queryParams,
  computed(() => !!selectedFacilityId.value),
)

const reviews = computed(() => reviewsData.value?.data ?? [])
const totalPages = computed(() => reviewsData.value?.pagination?.totalPages ?? 1)

const { mutateAsync: mutateReplyAsync, isPending: pending } = useOwnerReplyReviewMutation()
const { mutateAsync: mutateDeleteAsync, isPending: downloadPending } = useOwnerDeleteReviewMutation()

watch(selectedFacilityId, () => {
  page.value = 1
})

function startReply(reviewId: number) {
  replyingId.value = reviewId
  replyText.value = ""
}

async function submitReply(reviewId: number) {
  if (!replyText.value.trim()) return
  await mutateReplyAsync({ reviewId, reply: replyText.value })
  replyingId.value = null
  replyText.value = ""
}

// Xóa comment của customer
function handleDelete(reviewId: number) {
  reviewIdToDelete.value = reviewId
  deleteConfirmOpen.value = true
}

async function handleDeleteConfirm() {
  if (!reviewIdToDelete.value) return
  await mutateDeleteAsync(reviewIdToDelete.value)
  deleteConfirmOpen.value = false
  reviewIdToDelete.value = null
}

// Xóa reply comment
const { mutateAsync: mutateDeleteReplyAsync, isPending: deletingReplyPending } = useOwnerDeleteReplyReviewMutation()

function handleDeleteReply(reviewId: number) {
  replyIdToDelete.value = reviewId
  deleteReplyConfirmOpen.value = true
}

async function handleDeleteReplyConfirm() {
  if (!replyIdToDelete.value) return

  try {
    await mutateDeleteReplyAsync(replyIdToDelete.value)
    deleteReplyConfirmOpen.value = false
    replyIdToDelete.value = null
  } catch (err: any) {
    toast.error(err.response?.data?.message || "Có lỗi xảy ra")
    deleteReplyConfirmOpen.value = false
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("")
}

function formatDate(value: string) {
  if (!value) return ""
  return new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value))
}
</script>
