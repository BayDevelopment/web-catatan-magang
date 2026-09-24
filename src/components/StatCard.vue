<script setup lang="ts">
import { computed } from 'vue'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
} from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    title: string
    value: string
    description?: string
    type?: 'balance' | 'income' | 'expense' | 'transaction'
  }>(),
  {
    type: 'balance',
  },
)

const iconMap = {
  balance: Wallet,
  income: TrendingUp,
  expense: TrendingDown,
  transaction: Receipt,
}

// Peta warna otomatis berdasarkan tipe card
const colorMap = {
  balance: 'bg-indigo-50 text-indigo-600',
  income: 'bg-emerald-50 text-emerald-600',
  expense: 'bg-red-50 text-red-600',
  transaction: 'bg-blue-50 text-blue-600',
}

const Icon = computed(() => iconMap[props.type])
const colorClass = computed(() => colorMap[props.type] || 'bg-blue-50 text-blue-600')
</script>

<template>
  <div
    class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
  >
    <div class="flex items-start justify-between gap-4">

      <div>
        <p class="text-sm font-medium text-slate-500">
          {{ title }}
        </p>

        <p class="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {{ value }}
        </p>

        <p
          v-if="description"
          class="mt-2 text-xs text-slate-500"
        >
          {{ description }}
        </p>
      </div>

      <!-- Warna icon sekarang dinamis sesuai tipe -->
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        :class="colorClass"
      >
        <component :is="Icon" :size="23" />
      </div>

    </div>
  </div>
</template>