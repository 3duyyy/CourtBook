<template>
  <div class="container-layout facility-detail-page">
    <v-container class="max-w-7xl" v-if="facility">
      <FacilityDetailHeader :facility="facility!" />

      <FacilityDetailGallery v-model="activeImage" :facility="facility!" class="mt-6" />

      <div class="detail-layout mt-8">
        <div class="detail-layout__main">
          <FacilityDetailOverview :facility="facility!" />

          <FacilityDetailSlotPicker
            class="mt-6"
            :fields="fields || []"
            :selected-date="selectedDate"
            :selected-field-id="selectedFieldId"
            :selected-slot-ids="selectedSlotIds"
            @update:selected-date="selectedDate = $event"
            @toggle-slot="handleToggleSlot"
          />

          <FacilityDetailReviewList
            class="mt-6"
            :reviews="reviews || []"
            :facility-id="facilityId"
            @review-created="refetchReviews"
          />
        </div>

        <div class="detail-layout__side">
          <FacilityDetailBookingCard
            :selected-date="selectedDate"
            :selected-field-name="selectedFieldName"
            :selected-slot-label="selectedSlotLabel"
            :selected-slot-count="selectedSlots.length"
            :address="facility!.address"
            :latitude="facility!.latitude"
            :longitude="facility!.longitude"
            :price="selectedPrice"
            @confirm="handleConfirmBooking"
          />
        </div>
      </div>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import {
  useFacilityAvailabilityQuery,
  useFacilityDetailQuery,
  useFacilityReviewsQuery,
} from "~/composables/queries/facility/useFacilityDetailQueries"
import type { FacilityDetailSlot } from "~/types/facility"

definePageMeta({
  layout: "default",
})

const bookingStore = useBookingStore()
const route = useRoute()

const facilityId = computed(() => Number(route.params.id))

const activeImage = ref("")
const selectedDate = ref(getToday())

const selectedFieldId = ref<number | null>(null)
const selectedFieldName = ref<string | null>(null)
const selectedSlotIds = ref<string[]>([])

const { data: facility } = useFacilityDetailQuery(facilityId)
const { data: fields } = useFacilityAvailabilityQuery(facilityId, selectedDate)
const { data: reviews, refetch: refetchReviews } = useFacilityReviewsQuery(facilityId)

watch(
  facility,
  (value) => {
    if (!value) return
    activeImage.value = value.images.find((item) => item.isThumbnail)?.imageUrl || value.images[0]?.imageUrl || ""
  },
  { immediate: true },
)

const selectedField = computed(() => {
  if (!selectedFieldId.value) return null
  return fields.value?.find((item) => item.id === selectedFieldId.value) || null
})

const selectedSlots = computed(() => {
  if (!selectedField.value) return []

  return selectedField.value.slots.filter((slot) => selectedSlotIds.value.includes(slot.id))
})

const selectedSlotLabel = computed(() => {
  if (selectedSlots.value.length === 0) return null

  const sorted = [...selectedSlots.value].sort(compareSlotTime)
  const first = sorted.at(0)
  const last = sorted.at(-1)

  if (!first || !last) return null

  return `${first.startTime} - ${last.endTime}`
})

const selectedPrice = computed(() => {
  return selectedSlots.value.reduce((sum, slot) => sum + slot.price, 0)
})

watch(selectedDate, () => {
  resetSelection()
})

function handleToggleSlot(payload: { fieldId: number; fieldName: string; slot: FacilityDetailSlot }) {
  const { fieldId, fieldName, slot } = payload
  const field = fields.value?.find((item) => item.id === fieldId)

  if (!field || slot.isBooked) return

  if (selectedFieldId.value !== fieldId) {
    selectedFieldId.value = fieldId
    selectedFieldName.value = fieldName
    selectedSlotIds.value = [slot.id]
    return
  }

  const currentSlots = field.slots
  const sortedCurrentIds = [...selectedSlotIds.value]
  const clickedAlreadySelected = sortedCurrentIds.includes(slot.id)

  if (clickedAlreadySelected) {
    const nextIds = sortedCurrentIds.filter((id) => id !== slot.id)

    if (!nextIds.length) {
      resetSelection()
      return
    }

    if (!isContiguousSelection(currentSlots, nextIds)) {
      selectedSlotIds.value = []
      return
    }

    selectedSlotIds.value = nextIds
    return
  }

  const nextIds = [...sortedCurrentIds, slot.id]

  if (!isContiguousSelection(currentSlots, nextIds)) {
    selectedSlotIds.value = [slot.id]
    return
  }

  selectedSlotIds.value = sortSlotIdsByFieldOrder(currentSlots, nextIds)
}

function isContiguousSelection(fieldSlots: FacilityDetailSlot[], ids: string[]) {
  const selectedIndexes = fieldSlots
    .map((slot, index) => ({ id: slot.id, index, isBooked: slot.isBooked }))
    .filter((slot) => ids.includes(slot.id))

  if (!selectedIndexes.length) return false
  if (selectedIndexes.some((slot) => slot.isBooked)) return false

  const indexes = selectedIndexes.map((item) => item.index).sort((a, b) => a - b)

  for (let i = 1; i < indexes.length; i += 1) {
    const current = indexes[i]
    const previous = indexes[i - 1]

    if (current === undefined || previous === undefined) {
      return false
    }

    if (current !== previous + 1) {
      return false
    }
  }

  return true
}

function sortSlotIdsByFieldOrder(fieldSlots: FacilityDetailSlot[], ids: string[]) {
  const orderMap = new Map(fieldSlots.map((slot, index) => [slot.id, index]))

  return [...ids].sort((a, b) => {
    return (orderMap.get(a) ?? 0) - (orderMap.get(b) ?? 0)
  })
}

function compareSlotTime(a: FacilityDetailSlot, b: FacilityDetailSlot) {
  return a.startTime.localeCompare(b.startTime)
}

function resetSelection() {
  selectedFieldId.value = null
  selectedFieldName.value = null
  selectedSlotIds.value = []
}

function getToday() {
  const date = new Date()
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, "0")
  const d = `${date.getDate()}`.padStart(2, "0")
  return `${y}-${m}-${d}`
}

async function handleConfirmBooking() {
  if (!selectedField.value || !facility.value || selectedSlotIds.value.length === 0) return

  bookingStore.setDraft({
    facilityId: facility.value.id,
    facilityName: facility.value.name,
    facilityAddress: `${facility.value.address}, ${facility.value.district}, ${facility.value.city}`,
    facilityImage: activeImage.value || facility.value.images.find((img) => img.isThumbnail)?.imageUrl || null,
    sportName: facility.value.sportName,
    fieldId: selectedField.value.id,
    fieldName: selectedField.value.name,
    date: selectedDate.value,
    slots: selectedSlots.value.map((slot) => ({
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      price: slot.price,
    })),
    totalPrice: selectedPrice.value,
  })

  await navigateTo("/checkout")
}
</script>

<style scoped>
.facility-detail-page {
  min-height: calc(100vh - 64px);
  background: #f8fafc;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 24px;
  align-items: start;
}

.detail-layout__main,
.detail-layout__side {
  min-width: 0;
}

@media (max-width: 1200px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}
</style>
