<template>
  <v-dialog :model-value="open" max-width="900" persistent @update:model-value="emit('close')">
    <v-card rounded="xl">
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Thiết lập khung giá</span>
        <v-btn icon variant="text" @click="emit('close')"><v-icon>mdi-close</v-icon></v-btn>
      </v-card-title>
      <v-divider />

      <v-card-text>
        <div class="d-flex justify-space-between align-center mb-3">
          <p class="text-body-2 mb-0">Tối thiểu 1 khung giá</p>
          <v-btn color="success" variant="tonal" :disabled="isViewMode" @click="addRow">Thêm khung</v-btn>
        </div>

        <v-row v-for="row in rows" :key="row.clientId" class="mb-1">
          <v-col cols="12" md="2">
            <v-text-field v-model="row.startTime" label="Bắt đầu" placeholder="08:00" variant="outlined" :readonly="isViewMode" />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field v-model="row.endTime" label="Kết thúc" placeholder="09:00" variant="outlined" :readonly="isViewMode" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="row.pricePerHour"
              label="Giá/giờ"
              type="number"
              min="0"
              variant="outlined"
              :readonly="isViewMode"
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center">
            <v-checkbox v-model="row.isWeekend" label="Cuối tuần" color="success" hide-details :disabled="isViewMode" />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center justify-end">
            <v-btn variant="text" color="error" :disabled="isViewMode || rows.length <= 1" @click="removeRow(row.clientId)">
              Xóa khung
            </v-btn>
          </v-col>
        </v-row>

        <v-alert v-if="errorText" type="error" variant="tonal" class="mt-2">{{ errorText }}</v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="justify-end pa-4">
        <v-btn variant="tonal" @click="emit('close')">Đóng</v-btn>
        <v-btn v-if="!isViewMode" color="success" variant="flat" :loading="saving" @click="onSubmit">Lưu bảng giá</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ownerFieldPricingSchema } from "~/schemas/ownerFacilitySchema"
import type { OwnerFieldPricingItem, OwnerSetFieldPricesPayload } from "~/types/owner"

type PricingRow = {
  clientId: string
  startTime: string
  endTime: string
  pricePerHour: number
  isWeekend: boolean
}

const props = withDefaults(
  defineProps<{
    open: boolean
    saving?: boolean
    viewMode?: boolean
    initialPricings?: OwnerFieldPricingItem[]
    facilityOpenTime?: string
    facilityCloseTime?: string
  }>(),
  {
    saving: false,
    viewMode: false,
    initialPricings: () => [],
    facilityOpenTime: "00:00",
    facilityCloseTime: "23:59",
  },
)

const emit = defineEmits<{
  (e: "close"): void
  (e: "submit", payload: OwnerSetFieldPricesPayload): void
}>()

const isViewMode = computed(() => props.viewMode)
const rows = ref<PricingRow[]>([])
const errorText = ref("")

const normalizeRow = (row: {
  startTime: string
  endTime: string
  pricePerHour: number
  isWeekend?: boolean
}): Omit<PricingRow, "clientId"> => ({
  startTime: String(row.startTime ?? "").trim(),
  endTime: String(row.endTime ?? "").trim(),
  pricePerHour: Number(row.pricePerHour ?? 0),
  isWeekend: Boolean(row.isWeekend),
})

const createEmptyRow = (): PricingRow => ({
  clientId: crypto.randomUUID(),
  startTime: "08:00",
  endTime: "09:00",
  pricePerHour: 0,
  isWeekend: false,
})

const addRow = () => {
  errorText.value = ""
  rows.value.push(createEmptyRow())
}

const removeRow = (clientId: string) => {
  if (rows.value.length <= 1) return
  errorText.value = ""
  rows.value = rows.value.filter((r) => r.clientId !== clientId)
}

watch(
  () => [props.open, props.initialPricings] as const,
  () => {
    if (!props.open) {
      errorText.value = ""
      rows.value = []
      return
    }

    errorText.value = ""

    rows.value =
      props.initialPricings.length > 0
        ? props.initialPricings.map((p) => ({
            clientId: crypto.randomUUID(),
            ...normalizeRow(p),
          }))
        : [createEmptyRow()]
  },
  { immediate: true },
)

const onSubmit = () => {
  if (isViewMode.value) return

  errorText.value = ""

  const payload = {
    pricings: rows.value.map((r) => normalizeRow(r)),
  }

  const parsed = ownerFieldPricingSchema.safeParse(payload)
  if (!parsed.success) {
    errorText.value = parsed.error.issues[0]?.message ?? "Dữ liệu bảng giá không hợp lệ"
    return
  }

  for (const row of parsed.data.pricings) {
    if (row.startTime < props.facilityOpenTime || row.endTime > props.facilityCloseTime) {
      errorText.value = `Khung giờ ${row.startTime} - ${row.endTime} vượt ra ngoài giờ hoạt động của cụm sân (${props.facilityOpenTime} - ${props.facilityCloseTime})`
      return
    }
  }

  const pricings = parsed.data.pricings
  for (let i = 0; i < pricings.length; i++) {
    for (let j = i + 1; j < pricings.length; j++) {
      const a = pricings[i]!
      const b = pricings[j]!

      if (a.isWeekend !== b.isWeekend) continue

      if (a.startTime < b.endTime && b.startTime < a.endTime) {
        const label = a.isWeekend ? "cuối tuần" : "trong tuần"
        errorText.value = `Khung giờ ${a.startTime}-${a.endTime} và ${b.startTime}-${b.endTime} (${label}) bị chồng lấn nhau`
        return
      }
    }
  }

  emit("submit", parsed.data)
}
</script>
