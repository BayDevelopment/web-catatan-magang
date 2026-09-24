<script setup lang="ts">
import { reactive, watch } from 'vue'
import { X } from 'lucide-vue-next'

export interface TransactionFormData {
  description: string
  category: string
  amount: number
  transaction_date: string
}

const props = withDefaults(
  defineProps<{
    type: 'income' | 'expense'
    loading?: boolean
    initialData?: Partial<TransactionFormData> | null
  }>(),
  {
    loading: false,
    initialData: null,
  },
)

const emit = defineEmits<{
  submit: [data: TransactionFormData]
  cancel: []
}>()

const form = reactive<TransactionFormData>({
  description: '',
  category: '',
  amount: 0,
  transaction_date: new Date().toISOString().split('T')[0],
})

const categories = {
  income: [
    'Gaji',
    'Bonus',
    'Freelance',
    'Investasi',
    'Hadiah',
    'Lainnya',
  ],
  expense: [
    'Makanan',
    'Transportasi',
    'Belanja',
    'Tagihan',
    'Hiburan',
    'Kesehatan',
    'Pendidikan',
    'Lainnya',
  ],
}

watch(
  () => props.initialData,
  (data) => {
    form.description = data?.description ?? ''
    form.category = data?.category ?? ''
    form.amount = data?.amount ?? 0
    form.transaction_date =
      data?.transaction_date ??
      new Date().toISOString().split('T')[0]
  },
  {
    immediate: true,
  },
)

const handleSubmit = () => {
  if (!form.description.trim()) {
    alert('Deskripsi wajib diisi.')
    return
  }

  if (!form.category) {
    alert('Kategori wajib dipilih.')
    return
  }

  if (!form.amount || form.amount <= 0) {
    alert('Nominal harus lebih dari 0.')
    return
  }

  if (!form.transaction_date) {
    alert('Tanggal wajib diisi.')
    return
  }

  emit('submit', {
    description: form.description.trim(),
    category: form.category,
    amount: Number(form.amount),
    transaction_date: form.transaction_date,
  })
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold text-slate-900">
          {{ initialData ? 'Edit Transaksi' : 'Tambah Transaksi' }}
        </h2>

        <p class="mt-1 text-sm text-slate-500">
          {{
            type === 'income'
              ? 'Catat pemasukan baru'
              : 'Catat pengeluaran baru'
          }}
        </p>
      </div>

      <button
        type="button"
        @click="handleCancel"
        class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X :size="20" />
      </button>
    </div>

    <!-- Form -->
    <form
      @submit.prevent="handleSubmit"
      class="space-y-5"
    >

      <!-- Description -->
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700">
          Deskripsi
        </label>

        <input
          v-model="form.description"
          type="text"
          placeholder="Contoh: Gaji bulan September"
          class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <!-- Category -->
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700">
          Kategori
        </label>

        <select
          v-model="form.category"
          class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">
            Pilih kategori
          </option>

          <option
            v-for="category in categories[type]"
            :key="category"
            :value="category"
          >
            {{ category }}
          </option>
        </select>
      </div>

      <!-- Amount -->
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700">
          Nominal
        </label>

        <div class="relative">
          <span
            class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500"
          >
            Rp
          </span>

          <input
            v-model.number="form.amount"
            type="number"
            min="1"
            placeholder="0"
            class="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <!-- Date -->
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700">
          Tanggal
        </label>

        <input
          v-model="form.transaction_date"
          type="date"
          class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <!-- Buttons -->
      <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">

        <button
          type="button"
          @click="handleCancel"
          class="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Batal
        </button>

        <button
          type="submit"
          :disabled="loading"
          class="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ loading ? 'Menyimpan...' : 'Simpan Transaksi' }}
        </button>

      </div>
    </form>
  </div>
</template>