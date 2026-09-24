<script setup lang="ts">
import {
  Pencil,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-vue-next'

export interface Transaction {
  id: number | string
  type: 'income' | 'expense'
  description: string
  category: string
  amount: number
  transaction_date: string
}

defineProps<{
  transactions: Transaction[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [transaction: Transaction]
  delete: [transaction: Transaction]
}>()

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

const handleDelete = (transaction: Transaction) => {
  const confirmed = window.confirm(
    `Hapus transaksi "${transaction.description}"?`,
  )

  if (confirmed) {
    emit('delete', transaction)
  }
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

    <!-- Desktop table -->
    <div class="hidden overflow-x-auto md:block">
      <table class="w-full text-left">

        <thead class="border-b border-slate-200 bg-slate-50">
          <tr>
            <th class="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Transaksi
            </th>

            <th class="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Kategori
            </th>

            <th class="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tanggal
            </th>

            <th class="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nominal
            </th>

            <th class="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
              Aksi
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-slate-100">

          <tr
            v-for="transaction in transactions"
            :key="transaction.id"
            class="transition hover:bg-slate-50"
          >

            <!-- Description -->
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">

                <div
                  class="flex h-10 w-10 items-center justify-center rounded-xl"
                  :class="
                    transaction.type === 'income'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-red-50 text-red-600'
                  "
                >
                  <ArrowDownLeft
                    v-if="transaction.type === 'income'"
                    :size="19"
                  />

                  <ArrowUpRight
                    v-else
                    :size="19"
                  />
                </div>

                <div>
                  <p class="font-semibold text-slate-800">
                    {{ transaction.description }}
                  </p>

                  <p class="text-xs text-slate-500">
                    {{
                      transaction.type === 'income'
                        ? 'Uang Masuk'
                        : 'Uang Keluar'
                    }}
                  </p>
                </div>

              </div>
            </td>

            <!-- Category -->
            <td class="px-5 py-4">
              <span
                class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                {{ transaction.category }}
              </span>
            </td>

            <!-- Date -->
            <td class="px-5 py-4 text-sm text-slate-600">
              {{ formatDate(transaction.transaction_date) }}
            </td>

            <!-- Amount -->
            <td
              class="px-5 py-4 text-right text-sm font-bold"
              :class="
                transaction.type === 'income'
                  ? 'text-emerald-600'
                  : 'text-red-600'
              "
            >
              {{ transaction.type === 'income' ? '+' : '-' }}
              {{ formatCurrency(transaction.amount) }}
            </td>

            <!-- Action -->
            <td class="px-5 py-4">
              <div class="flex justify-center gap-2">

                <button
                  type="button"
                  @click="emit('edit', transaction)"
                  class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                  title="Edit"
                >
                  <Pencil :size="17" />
                </button>

                <button
                  type="button"
                  @click="handleDelete(transaction)"
                  class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                  title="Hapus"
                >
                  <Trash2 :size="17" />
                </button>

              </div>
            </td>

          </tr>

          <!-- Empty -->
          <tr v-if="!loading && transactions.length === 0">
            <td
              colspan="5"
              class="px-5 py-12 text-center"
            >
              <p class="font-medium text-slate-700">
                Belum ada transaksi
              </p>

              <p class="mt-1 text-sm text-slate-500">
                Transaksi yang kamu tambahkan akan muncul di sini.
              </p>
            </td>
          </tr>

          <!-- Loading -->
          <tr v-if="loading">
            <td
              colspan="5"
              class="px-5 py-12 text-center text-sm text-slate-500"
            >
              Memuat transaksi...
            </td>
          </tr>

        </tbody>
      </table>
    </div>

    <!-- Mobile -->
    <div class="divide-y divide-slate-100 md:hidden">

      <div
        v-for="transaction in transactions"
        :key="transaction.id"
        class="p-4"
      >
        <div class="flex items-start justify-between gap-3">

          <div class="flex min-w-0 items-center gap-3">

            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :class="
                transaction.type === 'income'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
              "
            >
              <ArrowDownLeft
                v-if="transaction.type === 'income'"
                :size="19"
              />

              <ArrowUpRight
                v-else
                :size="19"
              />
            </div>

            <div class="min-w-0">
              <p class="truncate font-semibold text-slate-800">
                {{ transaction.description }}
              </p>

              <p class="mt-1 text-xs text-slate-500">
                {{ transaction.category }} •
                {{ formatDate(transaction.transaction_date) }}
              </p>
            </div>

          </div>

          <p
            class="shrink-0 text-sm font-bold"
            :class="
              transaction.type === 'income'
                ? 'text-emerald-600'
                : 'text-red-600'
            "
          >
            {{ transaction.type === 'income' ? '+' : '-' }}
            {{ formatCurrency(transaction.amount) }}
          </p>

        </div>

        <div class="mt-3 flex justify-end gap-2">

          <button
            type="button"
            @click="emit('edit', transaction)"
            class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600"
          >
            Edit
          </button>

          <button
            type="button"
            @click="handleDelete(transaction)"
            class="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
          >
            Hapus
          </button>

        </div>
      </div>

      <!-- Empty mobile -->
      <div
        v-if="!loading && transactions.length === 0"
        class="px-5 py-12 text-center"
      >
        <p class="font-medium text-slate-700">
          Belum ada transaksi
        </p>

        <p class="mt-1 text-sm text-slate-500">
          Transaksi yang kamu tambahkan akan muncul di sini.
        </p>
      </div>

      <!-- Loading mobile -->
      <div
        v-if="loading"
        class="px-5 py-12 text-center text-sm text-slate-500"
      >
        Memuat transaksi...
      </div>

    </div>
  </div>
</template>