<script setup lang="ts">
import {
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-vue-next'

import { computed, ref } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'

interface Transaction {
  id: number
  description: string
  category: string
  type: 'income' | 'expense'
  amount: number
  date: string
}

const month = ref('2026-09')

const transactions = ref<Transaction[]>([
  {
    id: 1,
    description: 'Gaji Bulanan',
    category: 'Gaji',
    type: 'income',
    amount: 5000000,
    date: '2026-09-01',
  },
  {
    id: 2,
    description: 'Beli Gorengan',
    category: 'Makanan',
    type: 'expense',
    amount: 24000,
    date: '2026-09-02',
  },
  {
    id: 3,
    description: 'Bensin',
    category: 'Transportasi',
    type: 'expense',
    amount: 50000,
    date: '2026-09-03',
  },
  {
    id: 4,
    description: 'Freelance',
    category: 'Freelance',
    type: 'income',
    amount: 500000,
    date: '2026-09-10',
  },
])

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

const filteredTransactions = computed(() => {
  return transactions.value.filter((transaction) =>
    transaction.date.startsWith(month.value)
  )
})

const totalIncome = computed(() => {
  return filteredTransactions.value
    .filter((item) => item.type === 'income')
    .reduce((total, item) => total + item.amount, 0)
})

const totalExpense = computed(() => {
  return filteredTransactions.value
    .filter((item) => item.type === 'expense')
    .reduce((total, item) => total + item.amount, 0)
})

const balance = computed(() => {
  return totalIncome.value - totalExpense.value
})
</script>

<template>
  <DashboardLayout
    title="Laporan"
    subtitle="Lihat ringkasan keuangan kamu"
  >
    <!-- Main content -->
    <div class="relative overflow-hidden">
      <!-- Background blobs -->
      <div
        class="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl"
      ></div>

      <div
        class="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl"
      ></div>

      <div
        class="pointer-events-none absolute left-1/3 top-[40%] h-64 w-64 rounded-full bg-blue-200/25 blur-3xl"
      ></div>

      <div
        class="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-indigo-100/40 blur-3xl"
      ></div>

      <!-- Content -->
      <div class="relative z-10">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">
            Laporan Keuangan
          </h1>

          <p class="mt-1 text-sm text-slate-500">
            Lihat ringkasan pemasukan dan pengeluaran.
          </p>
        </div>

        <!-- Filter -->
        <div
          class="mb-6 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex sm:items-end"
        >
          <div class="w-full sm:max-w-xs">
            <label
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Periode
            </label>

            <input
              v-model="month"
              type="month"
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <!-- Summary -->
        <div class="grid gap-4 sm:grid-cols-3">
          <!-- Income -->
          <div
            class="rounded-2xl border border-emerald-100/80 bg-emerald-50/90 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"
              >
                <ArrowDownToLine :size="19" />
              </div>

              <span class="text-sm font-medium text-emerald-700">
                Pemasukan
              </span>
            </div>

            <p class="mt-4 text-2xl font-bold text-emerald-700">
              {{ formatRupiah(totalIncome) }}
            </p>
          </div>

          <!-- Expense -->
          <div
            class="rounded-2xl border border-red-100/80 bg-red-50/90 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600"
              >
                <ArrowUpFromLine :size="19" />
              </div>

              <span class="text-sm font-medium text-red-700">
                Pengeluaran
              </span>
            </div>

            <p class="mt-4 text-2xl font-bold text-red-700">
              {{ formatRupiah(totalExpense) }}
            </p>
          </div>

          <!-- Balance -->
          <div
            class="rounded-2xl border border-indigo-100/80 bg-indigo-50/90 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"
              >
                <FileText :size="19" />
              </div>

              <span class="text-sm font-medium text-indigo-700">
                Selisih
              </span>
            </div>

            <p class="mt-4 text-2xl font-bold text-indigo-700">
              {{ formatRupiah(balance) }}
            </p>
          </div>
        </div>

        <!-- Table -->
        <div
          class="relative mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl transition duration-200 hover:shadow-md"
        >
          <!-- Table blobs -->
          <div
            class="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-100/50 blur-3xl"
          ></div>

          <div
            class="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-violet-100/40 blur-3xl"
          ></div>

          <div class="relative">
            <!-- Table Header -->
            <div class="border-b border-slate-200/80 p-6">
              <h2 class="font-semibold text-slate-900">
                Detail Transaksi
              </h2>

              <p class="mt-1 text-sm text-slate-500">
                Semua transaksi pada periode yang dipilih.
              </p>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto">
              <table class="w-full min-w-[700px]">
                <thead class="bg-slate-50/80">
                  <tr>
                    <th
                      class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Tanggal
                    </th>

                    <th
                      class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Keterangan
                    </th>

                    <th
                      class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Kategori
                    </th>

                    <th
                      class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Jenis
                    </th>

                    <th
                      class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Nominal
                    </th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="transaction in filteredTransactions"
                    :key="transaction.id"
                    class="transition duration-150 hover:bg-slate-50/80"
                  >
                    <td class="px-6 py-4 text-sm text-slate-600">
                      {{ transaction.date }}
                    </td>

                    <td class="px-6 py-4 font-medium text-slate-900">
                      {{ transaction.description }}
                    </td>

                    <td class="px-6 py-4 text-sm text-slate-600">
                      {{ transaction.category }}
                    </td>

                    <td class="px-6 py-4">
                      <span
                        class="rounded-full px-3 py-1 text-xs font-medium"
                        :class="
                          transaction.type === 'income'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        "
                      >
                        {{
                          transaction.type === 'income'
                            ? 'Masuk'
                            : 'Keluar'
                        }}
                      </span>
                    </td>

                    <td
                      class="px-6 py-4 text-right font-semibold"
                      :class="
                        transaction.type === 'income'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      "
                    >
                      {{
                        transaction.type === 'income'
                          ? '+'
                          : '-'
                      }}

                      {{ formatRupiah(transaction.amount) }}
                    </td>
                  </tr>

                  <!-- Empty state -->
                  <tr v-if="filteredTransactions.length === 0">
                    <td
                      colspan="5"
                      class="px-6 py-14 text-center"
                    >
                      <div
                        class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"
                      >
                        <FileText :size="22" />
                      </div>

                      <p class="mt-4 text-sm font-medium text-slate-600">
                        Tidak ada transaksi
                      </p>

                      <p class="mt-1 text-sm text-slate-400">
                        Tidak ada transaksi pada periode ini.
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>