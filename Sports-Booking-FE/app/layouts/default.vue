<template>
  <v-app :theme="isDark ? 'dark' : 'light'">
    <!-- Header -->
    <Header />

    <v-main>
      <v-container fluid class="p-0 m-0">
        <slot />
      </v-container>
    </v-main>

    <Footer />
  </v-app>

  <Chatbot />
</template>

<script setup lang="ts">
import { mdiWhiteBalanceSunny, mdiMoonWaningCrescent } from "@mdi/js"
import Chatbot from "~/components/common/Chatbot.vue"
import Footer from "~/components/common/Footer.vue"
import Header from "~/components/common/Header.vue"

const isDark = useDark()
const toggleDark = useToggle(isDark)

const currentYear = new Date().getFullYear()
</script>
