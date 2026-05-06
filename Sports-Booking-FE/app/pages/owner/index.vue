<template>
  <div class="container-layout bg-slate-50 !pt-0 !mt-0">
    <div class="mx-auto max-w-7xl px-4 md:px-6">
      <AppBreadcrumbs
        :items="[
          { title: 'Trang chủ', to: '/' },
          { title: 'Khu vực chủ sân', disabled: true },
        ]"
        class="mb-4"
      />

      <div v-if="!isCustomer" class="mb-6">
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">
          {{ pageTitle }}
        </h1>

        <p class="mt-2 text-sm text-slate-500">
          {{ pageDescription }}
        </p>
      </div>

      <OwnerCustomerIntro v-if="isCustomer" @create="openFacilityCreate" />

      <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div class="lg:col-span-4 xl:col-span-3">
          <OwnerSidebar v-model="activeTab" />
        </div>

        <div class="lg:col-span-8 xl:col-span-9">
          <div v-if="activeTab === 'overview'" class="space-y-6">
            <v-alert v-if="ownerStatsError" type="error" variant="tonal" rounded="lg" class="mb-2">
              {{ ownerStatsError }}
            </v-alert>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <template v-if="isOwnerOverviewLoading">
                <v-skeleton-loader v-for="idx in 4" :key="'owner-stat-skeleton-' + idx" type="card" class="rounded-xl" />
              </template>

              <OwnerOverviewStatCard v-else v-for="item in overviewStats" :key="item.key" :item="item" />
            </div>

            <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div class="xl:col-span-12">
                <OwnerRecentBookingsTable
                  :items="overviewRecentBookings"
                  :pagination="overviewRecentPagination"
                  @update:page="handleRecentPageChange"
                />
              </div>

              <div class="xl:col-span-12">
                <OwnerTodayScheduleCard
                  :items="overviewTodaySchedule"
                  :is-full="isScheduleFull"
                  @toggle-full="toggleScheduleFull"
                />
              </div>
            </div>
          </div>

          <OwnerFacilitiesSection
            v-else-if="activeTab === 'facilities'"
            :items="facilities"
            :pagination="facilitiesPagination"
            :keyword="facilitiesKeyword"
            :status="facilitiesStatus"
            :loading="isFacilitiesLoading || isFacilitiesFetching"
            :error-message="facilitiesError"
            @update:page="handleFacilitiesPageChange"
            @update:keyword="facilitiesKeyword = $event"
            @update:status="facilitiesStatus = $event"
            @create="openFacilityCreate"
            @view="openFacilityView"
            @edit="openFacilityEdit"
            @delete="askDeleteFacility"
          />

          <div v-else-if="activeTab === 'calendar'" class="space-y-4">
            <v-alert v-if="calendarError" type="error" variant="tonal" rounded="lg">
              {{ calendarError }}
            </v-alert>

            <OwnerCalendarSection
              :facility-items="calendarFacilities"
              :event-items="calendarEvents"
              @range-change="handleCalendarRangeChange"
            />

            <AppLoading
              v-if="isCalendarLoading"
              :visible="true"
              :overlay="true"
              :persistent="false"
              :card="true"
              title="Đang tải lịch sân..."
              description=""
              :size="42"
            />
          </div>

          <OwnerCheckInSection
            v-else-if="activeTab === 'checkin'"
            :booking-item="checkInFoundBooking"
            :history-items="checkInHistory"
            :history-loading="isCheckInHistoryLoading"
            :is-searching="isCheckInSearching"
            :is-completing="isCheckInCompleting"
            :error-message="checkInErrorMessage"
            @search="handleCheckInSearch"
            @complete="handleOwnerCompleteCheckIn"
          />

          <OwnerReviewsSection v-else-if="activeTab === 'reviews'" :facility-options="ownerFacilitiesList" />

          <v-card v-else rounded="xl" class="border border-dashed border-slate-300 bg-white py-14 text-center shadow-none">
            <p class="text-base font-semibold text-slate-700">Tính năng này đang được hoàn thiện.</p>
            <p class="mt-2 text-sm text-slate-500">
              Trước mắt bạn có thể dùng tab Tổng quan để theo dõi nhanh hoạt động của sân.
            </p>
          </v-card>
        </div>
      </div>

      <OwnerFacilityDialog
        :open="facilityDialogOpen"
        :mode="facilityDialogMode"
        :saving="facilityDialogSaving"
        :sport-options="sportOptions"
        :utility-options="utilityOptions"
        :initial-data="facilityInitialData"
        :field-items="visibleDraftFields"
        @close="facilityDialogOpen = false"
        @submit-facility="onSubmitFacilityDialog"
        @add-field="onAddFieldClick"
        @edit-field="onEditFieldClick"
        @delete-field="askDeleteField"
        @set-prices="onSetPricesClick"
      />

      <OwnerFieldDialog
        :open="fieldDialogOpen"
        :mode="fieldDialogMode"
        :saving="fieldDialogSaving"
        :initial-data="
          selectedDraftField
            ? {
                name: selectedDraftField.name,
                description: selectedDraftField.description,
                status: selectedDraftField.status,
              }
            : null
        "
        @close="fieldDialogOpen = false"
        @submit="onSubmitFieldDialog"
      />

      <OwnerFieldPricingDialog
        :open="pricingDialogOpen"
        :saving="pricingDialogSaving"
        :view-mode="facilityDialogMode === 'view'"
        :initial-pricings="pricingInitial"
        :facility-open-time="pricingFacilityOpenTime"
        :facility-close-time="pricingFacilityCloseTime"
        @close="pricingDialogOpen = false"
        @submit="onSubmitPricingDialog"
      />

      <ConfirmDialog
        v-model="deleteFacilityConfirmOpen"
        title="Xóa cụm sân"
        message="Bạn chắc chắn muốn xóa cụm sân này?"
        confirm-text="Xóa"
        cancel-text="Hủy"
        confirm-color="error"
        :is-loading="deleteFacilityMutation.isPending.value"
        @confirm="confirmDeleteFacility"
      />

      <ConfirmDialog
        v-model="deleteFieldConfirmOpen"
        title="Xóa sân con"
        message="Bạn chắc chắn muốn xóa sân con này?"
        confirm-text="Xóa"
        cancel-text="Hủy"
        confirm-color="error"
        :is-loading="false"
        @confirm="confirmDeleteField"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { mdiAccountGroup, mdiCalendarToday, mdiCashMultiple, mdiCheckCircleOutline } from "@mdi/js"
import { toast } from "vue-sonner"
import AppBreadcrumbs from "~/components/common/AppBreadcrumbs.vue"
import AppLoading from "~/components/common/AppLoading.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import OwnerFieldPricingDialog from "~/components/owner/OwnerFieldPricingDialog.vue"
import {
  useOwnerCalendarQuery,
  useOwnerCheckInHistoryQuery,
  useOwnerCheckInSearchMutation,
  useOwnerCompleteCheckInMutation,
  useOwnerCreateFacilityMutation,
  useOwnerDeleteFacilityMutation,
  useOwnerFacilitiesQuery,
  useOwnerFacilityDetailQuery,
  useOwnerOverviewQuery,
  useOwnerUpdateFacilityMutation,
} from "~/composables/queries/facility/useOwnerQueries"
import { ownerOverviewMock } from "~/mockData/owner.mock"
import { facilityService } from "~/services/facilityService"
import { sportService } from "~/services/sportService"
import { utilityService } from "~/services/utilityService"
import type {
  OwnerCalendarQueryParams,
  OwnerCheckInBookingItem,
  OwnerFacilityDetailItem,
  OwnerFacilityStatus,
  OwnerFacilityUpsertPayload,
  OwnerOverviewStatApiItem,
  OwnerSetFieldPricesPayload,
  OwnerSidebarKey,
  OwnerStatItem,
} from "~/types/owner"

type DraftPricing = {
  startTime: string
  endTime: string
  pricePerHour: number
  isWeekend: boolean
}

type DraftField = {
  clientId: string
  id: number | null
  name: string
  description: string
  status: "active" | "maintenance" | "inactive"
  pricings: DraftPricing[]
  created: boolean
  dirty: boolean
  priceDirty: boolean
  deleted: boolean
}

useSeoMeta({
  title: "Khu vực chủ sân",
})

definePageMeta({
  layout: "default",
})

const authStore = useAuthStore()

const activeTab = ref<OwnerSidebarKey>("overview")
const userRoleId = ref<number | null>(null)

const recentPage = ref(1)
const recentLimit = ref(5)
const scheduleDefaultLimit = 5
const scheduleFullLimit = 100
const isScheduleFull = ref(false)

const facilitiesPage = ref(1)
const facilitiesLimit = ref(5)
const facilitiesKeyword = ref("")
const facilitiesStatus = ref<"all" | OwnerFacilityStatus>("all")

const pricingFacilityOpenTime = ref("00:00")
const pricingFacilityCloseTime = ref("23:59")

const defaultFrom = new Date()
defaultFrom.setHours(0, 0, 0, 0)
const defaultTo = new Date(defaultFrom)
defaultTo.setDate(defaultTo.getDate() + 7)

const calendarQueryParams = ref<OwnerCalendarQueryParams>({
  from: defaultFrom.toISOString(),
  to: defaultTo.toISOString(),
})

const checkInSearchError = ref("")
const checkInFoundBooking = ref<OwnerCheckInBookingItem | null>(null)

const debouncedFacilitiesKeyword = useDebounce(
  computed(() => facilitiesKeyword.value.trim()),
  400,
)

const getRoleIdFromStorage = () => {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem("user")
    if (!raw) return null
    const parsed = JSON.parse(raw) as { roleId?: number; role?: { id?: number; name?: string } }

    if (typeof parsed.roleId === "number") return parsed.roleId
    if (typeof parsed.role?.id === "number") return parsed.role.id
    if (parsed.role?.name === "admin") return 1
    if (parsed.role?.name === "owner") return 2
    if (parsed.role?.name === "customer") return 3
    return null
  } catch {
    return null
  }
}

const isCustomer = computed(() => userRoleId.value === 3)

const overviewQueryParams = computed(() => ({
  recentPage: recentPage.value,
  recentLimit: recentLimit.value,
  scheduleLimit: isScheduleFull.value ? scheduleFullLimit : scheduleDefaultLimit,
}))

const facilitiesQueryParams = computed(() => ({
  page: facilitiesPage.value,
  limit: facilitiesLimit.value,
  ...(debouncedFacilitiesKeyword.value ? { keyword: debouncedFacilitiesKeyword.value } : {}),
  ...(facilitiesStatus.value !== "all" ? { status: facilitiesStatus.value } : {}),
}))

const checkInHistoryQueryParams = computed(() => ({
  date: new Date().toISOString().slice(0, 10),
  page: 1,
  limit: 20,
}))

const {
  data: overviewData,
  isLoading: isOwnerOverviewLoading,
  error: ownerOverviewQueryError,
} = useOwnerOverviewQuery(
  overviewQueryParams,
  computed(() => !isCustomer.value && userRoleId.value !== null),
)

const {
  data: facilitiesData,
  isLoading: isFacilitiesLoading,
  isFetching: isFacilitiesFetching,
  error: facilitiesQueryError,
} = useOwnerFacilitiesQuery(
  facilitiesQueryParams,
  computed(() => !isCustomer.value && userRoleId.value !== null),
)

const {
  data: calendarData,
  isLoading: isCalendarLoading,
  error: calendarQueryError,
} = useOwnerCalendarQuery(
  calendarQueryParams,
  computed(() => !isCustomer.value && userRoleId.value !== null && activeTab.value === "calendar"),
)

const {
  data: checkInHistoryData,
  isLoading: isCheckInHistoryLoading,
  error: checkInHistoryQueryError,
} = useOwnerCheckInHistoryQuery(
  checkInHistoryQueryParams,
  computed(() => !isCustomer.value && userRoleId.value !== null && activeTab.value === "checkin"),
)

const checkInSearchMutation = useOwnerCheckInSearchMutation()
const completeCheckInMutation = useOwnerCompleteCheckInMutation()

const ownerStatsError = computed(() => {
  const err = ownerOverviewQueryError.value as unknown
  if (!err) return ""
  if (typeof err === "string") return err
  if (err instanceof Error) return err.message
  return "Không thể tải thống kê tổng quan chủ sân"
})

const statMeta: Record<OwnerOverviewStatApiItem["key"], { title: string; subtitle: string; icon: string; isCurrency?: boolean }> =
  {
    todayBookings: {
      title: "Lượt đặt hôm nay",
      subtitle: "So với hôm qua",
      icon: mdiCalendarToday,
    },
    monthlyRevenue: {
      title: "Doanh thu tháng này",
      subtitle: "So với tháng trước",
      icon: mdiCashMultiple,
      isCurrency: true,
    },
    newCustomers: {
      title: "Khách hàng mới",
      subtitle: "Trong 7 ngày gần nhất",
      icon: mdiAccountGroup,
    },
    completedBookings: {
      title: "Lượt đặt hoàn thành",
      subtitle: "Trong tháng này",
      icon: mdiCheckCircleOutline,
    },
  }

const formatValue = (value: number, isCurrency?: boolean) => {
  if (!isCurrency) return value
  return new Intl.NumberFormat("vi-VN").format(value) + "đ"
}

const formatChangeText = (changePercent: number | null, currentValue: number) => {
  if (changePercent === null) return currentValue > 0 ? "Mới" : "0%"
  if (changePercent < 0) return changePercent.toFixed(1) + "%"
  if (changePercent > 0) return "+" + changePercent.toFixed(1) + "%"
  return "0%"
}

const overviewRecentBookings = computed(() => overviewData.value?.recentBookings ?? [])
const overviewRecentPagination = computed(() => {
  return (
    overviewData.value?.recentPagination ?? {
      page: 1,
      limit: recentLimit.value,
      total: 0,
      totalPages: 1,
    }
  )
})
const overviewTodaySchedule = computed(() => overviewData.value?.todaySchedule ?? [])
const overviewStats = computed<OwnerStatItem[]>(() => {
  const rows = overviewData.value?.stats
  if (!rows?.length) return ownerOverviewMock.stats

  return rows.map((row: OwnerOverviewStatApiItem) => {
    const meta = statMeta[row.key]
    return {
      key: row.key,
      title: meta.title,
      value: formatValue(row.value, meta.isCurrency),
      subtitle: meta.subtitle,
      changeText: formatChangeText(row.changePercent, row.value),
      icon: meta.icon,
    }
  })
})

const facilities = computed(() => facilitiesData.value?.data ?? [])

const ownerFacilitiesList = computed(() => facilities.value.map((f) => ({ id: f.id, name: f.name })))

const facilitiesPagination = computed(
  () =>
    facilitiesData.value?.pagination ?? {
      page: 1,
      limit: facilitiesLimit.value,
      total: 0,
      totalPages: 1,
    },
)

const facilitiesError = computed(() => {
  const err = facilitiesQueryError.value as unknown
  if (!err) return ""
  if (typeof err === "string") return err
  if (err instanceof Error) return err.message
  return "Không thể tải danh sách cơ sở"
})

const calendarFacilities = computed(() => calendarData.value?.facilities ?? [])
const calendarEvents = computed(() => calendarData.value?.events ?? [])

const calendarError = computed(() => {
  const err = calendarQueryError.value as unknown
  if (!err) return ""
  if (typeof err === "string") return err
  if (err instanceof Error) return err.message
  return "Không thể tải lịch sân"
})

const checkInHistory = computed(() => checkInHistoryData.value?.data ?? [])
const isCheckInSearching = computed(() => checkInSearchMutation.isPending.value)
const isCheckInCompleting = computed(() => completeCheckInMutation.isPending.value)

const checkInHistoryError = computed(() => {
  const err = checkInHistoryQueryError.value as unknown
  if (!err) return ""
  if (typeof err === "string") return err
  if (err instanceof Error) return err.message
  return "Không thể tải lịch sử check-in"
})

const checkInErrorMessage = computed(() => checkInSearchError.value || checkInHistoryError.value)

const handleRecentPageChange = (page: number) => {
  recentPage.value = page
}

const toggleScheduleFull = () => {
  isScheduleFull.value = !isScheduleFull.value
}

const handleFacilitiesPageChange = (page: number) => {
  facilitiesPage.value = page
}

const handleCalendarRangeChange = (payload: { from: string; to: string }) => {
  calendarQueryParams.value = payload
}

const handleCheckInSearch = async (keyword: string) => {
  checkInSearchError.value = ""

  const normalized = keyword.trim()
  if (!normalized) {
    checkInFoundBooking.value = null
    return
  }

  try {
    checkInFoundBooking.value = await checkInSearchMutation.mutateAsync({ keyword: normalized })
  } catch (err) {
    if (typeof err === "string") checkInSearchError.value = err
    else if (err instanceof Error) checkInSearchError.value = err.message
    else checkInSearchError.value = "Không thể tìm booking check-in"
  }
}

const handleOwnerCompleteCheckIn = async (payload: { bookingId: number; collectedRemaining: boolean }) => {
  checkInSearchError.value = ""

  try {
    checkInFoundBooking.value = await completeCheckInMutation.mutateAsync({
      bookingId: payload.bookingId,
      payload: { collectedRemaining: payload.collectedRemaining },
    })
  } catch (err) {
    if (typeof err === "string") checkInSearchError.value = err
    else if (err instanceof Error) checkInSearchError.value = err.message
    else checkInSearchError.value = "Không thể hoàn thành check-in"
  }
}

watch(
  () => [debouncedFacilitiesKeyword.value, facilitiesStatus.value],
  () => {
    facilitiesPage.value = 1
  },
)

const pageTitle = computed(() => {
  return isCustomer.value ? "Trở thành chủ sân" : "Khu vực chủ sân"
})

const pageDescription = computed(() => {
  return isCustomer.value
    ? "Tạo sân đầu tiên để bắt đầu quản lý cơ sở thể thao và vận hành hoạt động kinh doanh của bạn."
    : "Theo dõi tình hình đặt sân, lịch trong ngày và quản lý cơ sở thể thao của bạn."
})

// facility dialog state
const facilityDialogOpen = ref(false)
const facilityDialogMode = ref<"create" | "edit" | "view">("create")
const selectedFacilityId = ref<number | null>(null)

// field dialog + pricing dialog state
const fieldDialogOpen = ref(false)
const fieldDialogMode = ref<"create" | "edit" | "view">("create")
const selectedFieldClientId = ref<string | null>(null)
const pricingDialogOpen = ref(false)

// confirm states
const deleteFacilityConfirmOpen = ref(false)
const facilityIdToDelete = ref<number | null>(null)
const deleteFieldConfirmOpen = ref(false)
const fieldClientIdToDelete = ref<string | null>(null)

// options
const sportOptions = ref<Array<{ label: string; value: number }>>([])
const utilityOptions = ref<Array<{ label: string; value: number }>>([])

// draft store
const draftFields = ref<DraftField[]>([])
const visibleDraftFields = computed(() => draftFields.value.filter((f) => !f.deleted))

// queries + mutations cho facility
const { data: facilityDetailData, isFetching: isFacilityDetailLoading } = useOwnerFacilityDetailQuery(
  selectedFacilityId,
  computed(() => facilityDialogOpen.value && selectedFacilityId.value !== null && facilityDialogMode.value !== "create"),
)

const createFacilityMutation = useOwnerCreateFacilityMutation()
const updateFacilityMutation = useOwnerUpdateFacilityMutation()
const deleteFacilityMutation = useOwnerDeleteFacilityMutation()

const isCommittingDraft = ref(false)
const facilityDialogSaving = computed(
  () =>
    isCommittingDraft.value ||
    createFacilityMutation.isPending.value ||
    updateFacilityMutation.isPending.value ||
    isFacilityDetailLoading.value,
)
const fieldDialogSaving = computed(() => isCommittingDraft.value)
const pricingDialogSaving = computed(() => isCommittingDraft.value)

const facilityInitialData = computed(() => facilityDetailData.value ?? null)

const mapDetailToDraft = (detail: OwnerFacilityDetailItem): DraftField[] =>
  detail.fields.map((f) => ({
    clientId: crypto.randomUUID(),
    id: f.id,
    name: f.name,
    description: f.description ?? "",
    status: f.status,
    pricings: f.pricings.map((p) => ({
      startTime: p.startTime,
      endTime: p.endTime,
      pricePerHour: p.pricePerHour,
      isWeekend: p.isWeekend,
    })),
    created: false,
    dirty: false,
    priceDirty: false,
    deleted: false,
  }))

watch(
  () => [facilityDialogOpen.value, facilityDialogMode.value, facilityInitialData.value] as const,
  () => {
    if (!facilityDialogOpen.value) return

    if (facilityDialogMode.value === "create") {
      draftFields.value = []
      return
    }

    if (facilityInitialData.value) {
      draftFields.value = mapDetailToDraft(facilityInitialData.value)
    }
  },
  { immediate: true },
)

const selectedDraftField = computed(() => {
  if (!selectedFieldClientId.value) return null
  return draftFields.value.find((f) => f.clientId === selectedFieldClientId.value) ?? null
})

const pricingInitial = computed(() => {
  return (selectedDraftField.value?.pricings ?? []).map((p, idx) => ({
    id: idx + 1,
    startTime: p.startTime,
    endTime: p.endTime,
    pricePerHour: p.pricePerHour,
    isWeekend: p.isWeekend,
  }))
})

// facility open/close
const openFacilityCreate = () => {
  facilityDialogMode.value = "create"
  selectedFacilityId.value = null
  facilityDialogOpen.value = true
}

const openFacilityView = (facilityId: number) => {
  facilityDialogMode.value = "view"
  selectedFacilityId.value = facilityId
  facilityDialogOpen.value = true
}

const openFacilityEdit = (facilityId: number) => {
  facilityDialogMode.value = "edit"
  selectedFacilityId.value = facilityId
  facilityDialogOpen.value = true
}

const askDeleteFacility = (facilityId: number) => {
  facilityIdToDelete.value = facilityId
  deleteFacilityConfirmOpen.value = true
}

const confirmDeleteFacility = async () => {
  if (!facilityIdToDelete.value) return
  try {
    await deleteFacilityMutation.mutateAsync(facilityIdToDelete.value)
    toast.success("Xóa cụm sân thành công")
  } catch (error: any) {
    toast.error(error?.response?.data?.message || "Không thể xóa cụm sân")
  } finally {
    deleteFacilityConfirmOpen.value = false
    facilityIdToDelete.value = null
  }
}

// field actions local-only
const onAddFieldClick = () => {
  if (facilityDialogMode.value === "view") return
  selectedFieldClientId.value = null
  fieldDialogMode.value = "create"
  fieldDialogOpen.value = true
}

const onEditFieldClick = (clientId: string) => {
  if (facilityDialogMode.value === "view") return
  selectedFieldClientId.value = clientId
  fieldDialogMode.value = "edit"
  fieldDialogOpen.value = true
}

const askDeleteField = (clientId: string) => {
  if (facilityDialogMode.value === "view") return
  fieldClientIdToDelete.value = clientId
  deleteFieldConfirmOpen.value = true
}

const confirmDeleteField = () => {
  const clientId = fieldClientIdToDelete.value
  if (!clientId) return

  const idx = draftFields.value.findIndex((f) => f.clientId === clientId)
  if (idx >= 0) {
    const row = draftFields.value[idx]
    if (row!.created) {
      draftFields.value.splice(idx, 1)
    } else {
      draftFields.value[idx] = { ...row!, deleted: true, dirty: false, priceDirty: false }
    }
  }

  deleteFieldConfirmOpen.value = false
  fieldClientIdToDelete.value = null
}

const onSubmitFieldDialog = (payload: {
  name?: string
  description?: string
  status?: "active" | "maintenance" | "inactive"
}) => {
  if (fieldDialogMode.value === "create") {
    draftFields.value.push({
      clientId: crypto.randomUUID(),
      id: null,
      name: payload.name?.trim() || "",
      description: payload.description?.trim() || "",
      status: payload.status || "active",
      pricings: [],
      created: true,
      dirty: true,
      priceDirty: false,
      deleted: false,
    })
    fieldDialogOpen.value = false
    return
  }

  const row = selectedDraftField.value
  if (!row) return

  row.name = payload.name?.trim() || row.name
  row.description = payload.description?.trim() || ""
  row.status = payload.status || row.status
  row.dirty = true
  fieldDialogOpen.value = false
}

// pricing local-only
const onSetPricesClick = (payload: { clientId: string; openTime: string; closeTime: string }) => {
  if (facilityDialogMode.value === "view") return
  selectedFieldClientId.value = payload.clientId
  pricingFacilityOpenTime.value = payload.openTime
  pricingFacilityCloseTime.value = payload.closeTime
  pricingDialogOpen.value = true
}

const onSubmitPricingDialog = (payload: OwnerSetFieldPricesPayload) => {
  const row = selectedDraftField.value
  if (!row) return

  row.pricings = payload.pricings.map((p) => ({
    startTime: p.startTime,
    endTime: p.endTime,
    pricePerHour: p.pricePerHour,
    isWeekend: Boolean(p.isWeekend),
  }))
  row.priceDirty = true
  pricingDialogOpen.value = false
}

// commit APIs only when saving facility dialog
const commitFieldChanges = async (facilityId: number) => {
  const toCreate = draftFields.value.filter((f) => !f.deleted && f.created)
  const toUpdate = draftFields.value.filter((f) => !f.deleted && !f.created && (f.dirty || f.priceDirty))
  const toDelete = draftFields.value.filter((f) => f.deleted && !!f.id)

  for (const f of toCreate) {
    const created = await facilityService.createOwnerField(facilityId, {
      name: f.name,
      description: f.description,
    })
    const newId = created.data.data.id

    if (f.pricings.length > 0) {
      await facilityService.setOwnerFieldPrices(newId, { pricings: f.pricings })
    }
  }

  for (const f of toUpdate) {
    if (!f.id) continue

    if (f.dirty) {
      await facilityService.updateOwnerField(f.id, {
        name: f.name,
        description: f.description,
        status: f.status,
      })
    }

    if (f.priceDirty) {
      await facilityService.setOwnerFieldPrices(f.id, { pricings: f.pricings })
    }
  }

  for (const f of toDelete) {
    await facilityService.deleteOwnerField(f.id!)
  }
}

const onSubmitFacilityDialog = async (facilityPayload: OwnerFacilityUpsertPayload) => {
  try {
    isCommittingDraft.value = true

    let facilityId: number

    if (facilityDialogMode.value === "create") {
      const created = await createFacilityMutation.mutateAsync(facilityPayload)
      facilityId = created.id

      // Nếu user đang là Customer, tạo xong thì cập nhật thành Owner
      if (authStore.user && authStore.user.roleId === 3) {
        authStore.setUser({
          ...authStore.user,
          roleId: 2,
        })
        // Cập nhật lại state của màn hình hiện tại luôn để ẩn Intro
        userRoleId.value = 2
      }
    } else {
      if (!selectedFacilityId.value) return
      facilityId = selectedFacilityId.value
      await updateFacilityMutation.mutateAsync({ facilityId, payload: facilityPayload })
    }

    await commitFieldChanges(facilityId)

    toast.success(facilityDialogMode.value === "create" ? "Tạo cụm sân thành công" : "Cập nhật cụm sân thành công")
    facilityDialogOpen.value = false
  } catch (error: any) {
    toast.error(error?.response?.data?.message || "Không thể lưu cụm sân")
  } finally {
    isCommittingDraft.value = false
  }
}

const loadFacilityOptions = async () => {
  try {
    const [sportsRes, utilitiesRes] = await Promise.all([sportService.getAllSports(), utilityService.getAllUtilities()])

    sportOptions.value = (sportsRes.data.data || []).map((s) => ({ label: s.name, value: s.id }))
    utilityOptions.value = (utilitiesRes.data.data || []).map((u) => ({ label: u.name, value: u.id }))
  } catch {
    sportOptions.value = []
    utilityOptions.value = []
  }
}

onMounted(() => {
  userRoleId.value = getRoleIdFromStorage()
  loadFacilityOptions()
})
</script>

<style scoped></style>
