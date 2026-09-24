<script setup lang="ts">
import {
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
} from 'lucide-vue-next'

import { computed, onMounted, ref } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { getTransactions } from '../services/transaction.service'
import type { Transaction } from '../types/transaction'

const transactions = ref<Transaction[]>([])
const loading = ref(true)
const errorMessage = ref('')

const month = ref(
  new Date().toISOString().slice(0, 7),
)

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

const loadTransactions = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    transactions.value = await getTransactions()
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Gagal mengambil data laporan transaksi.'
  } finally {
    loading.value = false
  }
}

const filteredTransactions = computed(() => {
  return transactions.value.filter((transaction) =>
    transaction.transaction_date.startsWith(month.value)
  )
})

const totalIncome = computed(() => {
  return filteredTransactions.value
    .filter((item) => item.type === 'income')
    .reduce((total, item) => total + Number(item.amount), 0)
})

const totalExpense = computed(() => {
  return filteredTransactions.value
    .filter((item) => item.type === 'expense')
    .reduce((total, item) => total + Number(item.amount), 0)
})

const balance = computed(() => {
  return totalIncome.value - totalExpense.value
})

onMounted(() => {
  void loadTransactions()
})
</script>

<template>
  <!-- =========================================================
       BACKGROUND BLOBS
       Langsung di BODY agar tidak terikat oleh container content
  ========================================================== -->
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <!-- Blob kiri atas -->
      <div
        class="absolute -left-40 -top-40 h-[500px] w-[500px] transform-gpu rounded-full bg-indigo-300/30 blur-[120px]"
      ></div>

      <!-- Blob kanan -->
      <div
        class="absolute -right-40 top-1/4 h-[450px] w-[450px] transform-gpu rounded-full bg-purple-300/25 blur-[120px]"
      ></div>

      <!-- Blob bawah tengah -->
      <div
        class="absolute -bottom-32 left-1/3 h-[450px] w-[450px] transform-gpu rounded-full bg-blue-200/30 blur-[120px]"
      ></div>

      <!-- Blob kanan bawah -->
      <div
        class="absolute bottom-10 right-10 h-80 w-80 transform-gpu rounded-full bg-sky-200/20 blur-[100px]"
      ></div>
    </div>
  </Teleport>

  <DashboardLayout
    title="Laporan"
    subtitle="Lihat ringkasan keuangan kamu"
  >
    <!-- Main content -->
    <div class="relative">
      <!-- Content -->
      <div class="relative z-10">

        <!-- Header & Refresh Button -->
        <div
          class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <h1
              class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            >
              Laporan Keuangan
            </h1>

            <p class="mt-1 text-sm text-slate-500">
              Lihat ringkasan pemasukan dan pengeluaran.
            </p>
          </div>

          <button
            type="button"
            :disabled="loading"
            class="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
            @click="loadTransactions"
          >
            <RefreshCw
              :size="16"
              :class="loading ? 'animate-spin' : ''"
            />

            Refresh
          </button>
        </div>

        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ errorMessage }}
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

        <!-- Summary Cards -->
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
          class="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl transition duration-200 hover:shadow-md"
        >
          <div>

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

                <!-- Skeleton Loading -->
                <tbody
                  v-if="loading"
                  class="divide-y divide-slate-100 animate-pulse"
                >
                  <tr
                    v-for="i in 3"
                    :key="'skeleton-report-' + i"
                  >
                    <td class="px-6 py-4">
                      <div
                        class="h-4 w-24 rounded bg-slate-200"
                      ></div>
                    </td>

                    <td class="px-6 py-4">
                      <div
                        class="h-4 w-40 rounded bg-slate-200"
                      ></div>
                    </td>

                    <td class="px-6 py-4">
                      <div
                        class="h-4 w-28 rounded bg-slate-200"
                      ></div>
                    </td>

                    <td class="px-6 py-4">
                      <div
                        class="h-6 w-16 rounded-full bg-slate-200"
                      ></div>
                    </td>

                    <td class="px-6 py-4 text-right">
                      <div
                        class="ml-auto h-4 w-24 rounded bg-slate-200"
                      ></div>
                    </td>
                  </tr>
                </tbody>

                <!-- Table Content -->
                <tbody
                  v-else
                  class="divide-y divide-slate-100"
                >
                  <tr
                    v-for="transaction in filteredTransactions"
                    :key="transaction.id"
                    class="transition duration-150 hover:bg-slate-50/80"
                  >
                    <td class="px-6 py-4 text-sm text-slate-600">
                      {{ formatDate(transaction.transaction_date) }}
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

                      {{ formatRupiah(Number(transaction.amount)) }}
                    </td>
                  </tr>

                  <!-- Empty state -->
                  <tr
                    v-if="
                      !loading &&
                      filteredTransactions.length === 0
                    "
                  >
                    <td
                      colspan="5"
                      class="px-6 py-14 text-center"
                    >
                      <div
                        class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"
                      >
                        <FileText :size="22" />
                      </div>

                      <p
                        class="mt-4 text-sm font-medium text-slate-600"
                      >
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