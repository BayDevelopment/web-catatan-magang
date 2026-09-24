<script setup lang="ts">
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

const Icon = iconMap[props.type]
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

      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
      >
        <component :is="Icon" :size="23" />
      </div>

    </div>
  </div>
</template>