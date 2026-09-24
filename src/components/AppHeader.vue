<script setup lang="ts">
import { computed } from 'vue'
import { LogOut, UserCircle } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'

defineProps<{
  title: string
  subtitle?: string
}>()

const authStore = useAuthStore()

const userEmail = computed(() => {
  return authStore.user?.email ?? 'User'
})

const handleLogout = async () => {
  try {
    await authStore.logout()
  } catch (error) {
    console.error('Logout gagal:', error)
  }
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div class="flex min-h-20 items-center justify-between px-4 sm:px-6 lg:px-8">

      <!-- Title -->
      <div>
        <h1 class="text-xl font-bold text-slate-900 sm:text-2xl">
          {{ title }}
        </h1>

        <p
          v-if="subtitle"
          class="mt-1 text-sm text-slate-500"
        >
          {{ subtitle }}
        </p>
      </div>

      <!-- User -->
      <div class="flex items-center gap-3">
        <div class="hidden text-right sm:block">
          <p class="text-sm font-semibold text-slate-800">
            {{ userEmail }}
          </p>

          <p class="text-xs text-slate-500">
            Akun Saya
          </p>
        </div>

        <div
          class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600"
        >
          <UserCircle :size="22" />
        </div>

        <button
          type="button"
          @click="handleLogout"
          class="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          title="Logout"
        >
          <LogOut :size="20" />
        </button>
      </div>

    </div>
  </header>
</template>