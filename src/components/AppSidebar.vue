<script setup lang="ts">
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileBarChart,
  WalletCards,
} from 'lucide-vue-next'

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
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white lg:block"
  >
    <!-- Logo -->
    <div class="flex h-20 items-center gap-3 border-b border-slate-200 px-6">
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

    <!-- Navigation -->
    <nav class="space-y-1 p-4">
      <RouterLink
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        active-class="bg-blue-50 text-blue-600"
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
    <div class="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
      <p class="text-center text-xs text-slate-400">
        KeuanganKu © 2026
      </p>
    </div>
  </aside>
</template>