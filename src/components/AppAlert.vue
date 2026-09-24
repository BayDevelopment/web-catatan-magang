<script setup lang="ts">
import {
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-vue-next'

defineProps<{
  type: 'success' | 'error'
  title: string
  message: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
  >
    <div
      class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
    >
      <div class="flex items-start gap-4">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          :class="
            type === 'success'
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-red-100 text-red-600'
          "
        >
          <CheckCircle2
            v-if="type === 'success'"
            :size="24"
          />

          <AlertCircle
            v-else
            :size="24"
          />
        </div>

        <div class="flex-1">
          <h3 class="font-semibold text-slate-900">
            {{ title }}
          </h3>

          <p class="mt-1 text-sm leading-6 text-slate-500">
            {{ message }}
          </p>
        </div>

        <button
          type="button"
          @click="emit('close')"
          class="text-slate-400 transition hover:text-slate-700"
        >
          <X :size="20" />
        </button>
      </div>

      <button
        type="button"
        @click="emit('close')"
        class="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
      >
        Mengerti
      </button>
    </div>
  </div>
</template>