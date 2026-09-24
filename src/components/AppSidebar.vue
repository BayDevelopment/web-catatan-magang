<script setup lang="ts">
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileBarChart,
  WalletCards,
  X,
} from 'lucide-vue-next'

import {
  onMounted,
  onUnmounted,
  ref,
} from 'vue'

const menuItems = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Uang Masuk',
    path: '/income',
    icon: ArrowDownToLine,
  },
  {
    name: 'Uang Keluar',
    path: '/expense',
    icon: ArrowUpFromLine,
  },
  {
    name: 'Laporan',
    path: '/reports',
    icon: FileBarChart,
  },
]

const mobileOpen = ref(false)

const openMobileSidebar = () => {
  mobileOpen.value = true
}

const closeMobileSidebar = () => {
  mobileOpen.value = false
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeMobileSidebar()
  }
}

onMounted(() => {
  window.addEventListener(
    'open-mobile-sidebar',
    openMobileSidebar,
  )

  window.addEventListener(
    'keydown',
    handleKeydown,
  )
})

onUnmounted(() => {
  window.removeEventListener(
    'open-mobile-sidebar',
    openMobileSidebar,
  )

  window.removeEventListener(
    'keydown',
    handleKeydown,
  )
})
</script>

<template>
  <!-- Mobile overlay -->
  <Transition name="fade">
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
      @click="closeMobileSidebar"
    ></div>
  </Transition>

  <!-- Sidebar -->
  <aside
    class="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-out lg:z-40 lg:translate-x-0 lg:shadow-none"
    :class="
      mobileOpen
        ? 'translate-x-0'
        : '-translate-x-full'
    "
  >
    <!-- Logo -->
    <div
      class="flex h-20 items-center justify-between border-b border-slate-200 px-6"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"
        >
          <WalletCards :size="22" />
        </div>

        <div>
          <h2 class="font-bold text-slate-900">
            KeuanganKu
          </h2>

          <p class="text-xs text-slate-500">
            Personal Finance
          </p>
        </div>
      </div>

      <!-- Close mobile -->
      <button
        type="button"
        aria-label="Tutup menu"
        class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
        @click="closeMobileSidebar"
      >
        <X :size="20" />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="space-y-1 p-4">
      <RouterLink
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        active-class="bg-blue-50 text-blue-600"
        @click="closeMobileSidebar"
      >
        <component
          :is="item.icon"
          :size="20"
          class="shrink-0"
        />

        <span>
          {{ item.name }}
        </span>
      </RouterLink>
    </nav>

    <!-- Footer -->
    <div
      class="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4"
    >
      <p class="text-center text-xs text-slate-400">
        KeuanganKu © 2026
      </p>
    </div>
  </aside>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>