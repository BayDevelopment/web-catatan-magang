<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { LogOut, UserCircle, ChevronDown } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'

defineProps<{
  title: string
  subtitle?: string
}>()

const authStore = useAuthStore()
const dropdownOpen = ref(false)

const userEmail = computed(() => {
  return authStore.user?.email ?? 'User'
})

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const closeDropdown = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.profile-dropdown-container')) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})

const handleLogout = async () => {
  dropdownOpen.value = false
  try {
    await authStore.logout()
  } catch (error) {
    console.error('Logout gagal:', error)
  }
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div class="flex min-h-20 items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">

      <!-- Title & Subtitle -->
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-lg font-bold text-slate-900 sm:text-2xl">
          {{ title }}
        </h1>

        <p
          v-if="subtitle"
          class="hidden truncate text-xs text-slate-500 sm:block sm:text-sm"
        >
          {{ subtitle }}
        </p>
      </div>

      <!-- User Profile & Dropdown Menu -->
      <div class="relative profile-dropdown-container flex items-center">
        
        <!-- Profile Trigger Button -->
        <button
          type="button"
          @click="toggleDropdown"
          class="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-slate-100 focus:outline-none"
          aria-haspopup="true"
          :aria-expanded="dropdownOpen"
        >
          <div class="hidden text-right sm:block">
            <p class="max-w-[160px] truncate text-sm font-semibold text-slate-800">
              {{ userEmail }}
            </p>
            <p class="text-xs text-slate-500">
              Akun Saya
            </p>
          </div>

          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-semibold shadow-inner"
          >
            <UserCircle :size="24" />
          </div>
          
          <ChevronDown 
            :size="16" 
            class="text-slate-400 hidden sm:block transition-transform duration-200" 
            :class="{ 'rotate-180': dropdownOpen }" 
          />
        </button>

        <!-- Dropdown Menu -->
        <transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <div
            v-if="dropdownOpen"
            class="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xl shadow-slate-200/50 backdrop-blur-xl z-50"
          >
            <!-- Mobile Email Info Header inside Dropdown -->
            <div class="mb-2 border-b border-slate-100 px-3 pb-3 sm:hidden">
              <p class="text-xs text-slate-400">Masuk sebagai</p>
              <p class="truncate text-sm font-semibold text-slate-800">{{ userEmail }}</p>
            </div>

            <div class="space-y-1">
              <button
                type="button"
                @click="handleLogout"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut :size="18" />
                Keluar (Logout)
              </button>
            </div>
          </div>
        </transition>

      </div>

    </div>
  </header>
</template>