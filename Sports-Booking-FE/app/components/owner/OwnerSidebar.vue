<template>
  <v-card rounded="xl" class="owner-sidebar border border-slate-200 shadow-sm">
    <div class="px-4 py-5">
      <h2 class="text-base font-bold text-slate-900">Khu vực chủ sân</h2>
      <p class="mt-1 text-sm text-slate-500">Quản lý sân, lịch đặt và doanh thu.</p>
    </div>

    <v-divider />

    <v-list nav class="px-2 py-3 bg-transparent">
      <v-list-item
        v-for="item in items"
        :key="item.key"
        rounded="xl"
        :active="modelValue === item.key"
        class="mb-2"
        @click="handleSelect(item.key)"
      >
        <template #prepend>
          <v-icon :icon="item.icon" size="20" />
        </template>

        <v-list-item-title class="text-sm font-medium">
          {{ item.title }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import { mdiViewDashboardOutline, mdiSoccer, mdiCalendarMonthOutline, mdiQrcodeScan, mdiStarOutline } from "@mdi/js"
import type { OwnerSidebarKey } from "~/types/owner"

interface SidebarItem {
  key: OwnerSidebarKey
  title: string
  icon: string
}

const modelValue = defineModel<OwnerSidebarKey>({ default: "overview" })

const items: SidebarItem[] = [
  { key: "overview", title: "Tổng quan", icon: mdiViewDashboardOutline },
  { key: "facilities", title: "Cơ sở thể thao", icon: mdiSoccer },
  { key: "calendar", title: "Lịch sân", icon: mdiCalendarMonthOutline },
  { key: "checkin", title: "Check-in", icon: mdiQrcodeScan },
  { key: "reviews", title: "Đánh giá", icon: mdiStarOutline },
]

const handleSelect = (key: OwnerSidebarKey) => {
  modelValue.value = key
}
</script>

<style scoped>
.owner-sidebar {
  position: sticky;
  top: 90px;
}

.owner-sidebar :deep(.v-list-item) {
  min-height: 48px;
  color: rgb(71 85 105);
}

.owner-sidebar :deep(.v-list-item--active) {
  background: rgb(220 252 231);
  color: rgb(22 163 74);
}

.owner-sidebar :deep(.v-list-item--active .v-icon) {
  color: rgb(22 163 74);
}
</style>
