<script setup lang="ts">
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  TrendingUp,
  Menu,
  RefreshCw,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import DashboardLayout from '../layouts/DashboardLayout.vue'
import { getTransactions } from '../services/transaction.service'
import type { Transaction } from '../types/transaction'

const transactions = ref<Transaction[]>([])
const loading = ref(true)
const errorMessage = ref('')

const selectedMonth = ref(
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

const formatMonth = (month: string) => {
  const date = new Date(`${month}-01T00:00:00`)

  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date)
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
        : 'Gagal mengambil data transaksi.'
  } finally {
    loading.value = false
  }
}

/**
 * Semua transaksi yang dimiliki user.
 */
const allTransactions = computed(() => {
  return transactions.value
})

/**
 * Saldo keseluruhan.
 */
const balance = computed(() => {
  return allTransactions.value.reduce((total, transaction) => {
    if (transaction.type === 'income') {
      return total + Number(transaction.amount)
    }

    return total - Number(transaction.amount)
  }, 0)
})

/**
 * Transaksi berdasarkan bulan yang dipilih.
 */
const monthlyTransactions = computed(() => {
  return allTransactions.value.filter((transaction) => {
    return transaction.transaction_date.startsWith(
      selectedMonth.value,
    )
  })
})

/**
 * Total pemasukan bulan terpilih.
 */
const income = computed(() => {
  return monthlyTransactions.value
    .filter((transaction) => transaction.type === 'income')
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0,
    )
})

/**
 * Total pengeluaran bulan terpilih.
 */
const expense = computed(() => {
  return monthlyTransactions.value
    .filter((transaction) => transaction.type === 'expense')
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount),
      0,
    )
})

/**
 * Selisih pemasukan dan pengeluaran.
 */
const monthlyBalance = computed(() => {
  return income.value - expense.value
})

/**
 * Transaksi terbaru.
 */
const recentTransactions = computed(() => {
  return [...allTransactions.value]
    .sort((a, b) => {
      const dateA = new Date(
        `${a.transaction_date}T${a.created_at.slice(11, 19)}`,
      ).getTime()

      const dateB = new Date(
        `${b.transaction_date}T${b.created_at.slice(11, 19)}`,
      ).getTime()

      return dateB - dateA
    })
    .slice(0, 5)
})

/**
 * Generate pilihan 6 bulan terakhir.
 */
const monthOptions = computed(() => {
  const options: string[] = []

  const current = new Date()

  for (let i = 0; i < 6; i++) {
    const date = new Date(
      current.getFullYear(),
      current.getMonth() - i,
      1,
    )

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(
      2,
      '0',
    )

    options.push(`${year}-${month}`)
  }

  return options
})

/**
 * Nilai tertinggi untuk menentukan tinggi chart.
 */
const chartMax = computed(() => {
  return Math.max(income.value, expense.value, 1)
})

const incomeHeight = computed(() => {
  return `${Math.max(
    (income.value / chartMax.value) * 100,
    income.value > 0 ? 8 : 0,
  )}%`
})

const expenseHeight = computed(() => {
  return `${Math.max(
    (expense.value / chartMax.value) * 100,
    expense.value > 0 ? 8 : 0,
  )}%`
})

const openMobileSidebar = () => {
  window.dispatchEvent(
    new CustomEvent('open-mobile-sidebar'),
  )
}

onMounted(() => {
  void loadTransactions()
})
</script>

<template>
  <DashboardLayout
    title="Dashboard"
    subtitle="Ringkasan keuangan kamu"
  >
    <div class="relative min-h-full overflow-hidden">
      <!-- Background blobs -->
      <div
        class="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl"
      ></div>

      <div
        class="pointer-events-none absolute -right-24 top-32 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl"
      ></div>

      <div
        class="pointer-events-none absolute left-1/3 top-[40%] h-64 w-64 rounded-full bg-blue-200/30 blur-3xl"
      ></div>

      <div
        class="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-indigo-100/50 blur-3xl"
      ></div>

      <div class="relative">
        <!-- Mobile header -->
        <div
          class="mb-5 flex items-center justify-between lg:hidden"
        >
          <div>
            <p class="text-xs text-slate-500">
              KeuanganKu
            </p>

            <h1
              class="text-xl font-bold tracking-tight text-slate-900"
            >
              Dashboard
            </h1>
          </div>

          <button
            type="button"
            aria-label="Buka menu"
            class="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md"
            @click="openMobileSidebar"
          >
            <Menu :size="22" />
          </button>
        </div>

        <!-- Header -->
        <div
          class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p class="text-sm capitalize text-slate-500">
              {{ formatMonth(selectedMonth) }}
            </p>

            <h1
              class="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            >
              Dashboard
            </h1>

            <p class="mt-1 text-sm text-slate-500">
              Pantau kondisi keuangan kamu.
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

        <!-- Error -->
        <div
          v-if="errorMessage"
          class="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ errorMessage }}
        </div>

        <!-- SUMMARY CARDS & SKELETON -->
        <div
          class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <!-- Skeleton Card 1-4 (Muncul Saat Loading) -->
          <template v-if="loading">
            <div
              v-for="i in 4"
              :key="'skeleton-card-' + i"
              class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur"
            >
              <div class="h-11 w-11 animate-pulse rounded-xl bg-slate-200"></div>
              <div class="mt-5 h-4 w-20 animate-pulse rounded bg-slate-200"></div>
              <div class="mt-2 h-7 w-32 animate-pulse rounded bg-slate-200"></div>
            </div>
          </template>

          <!-- Actual Summary Cards -->
          <template v-else>
            <!-- Saldo -->
            <div
              class="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
              >
                <Wallet :size="21" />
              </div>

              <p class="mt-5 text-sm text-slate-500">
                Saldo
              </p>

              <p
                class="mt-1 break-words text-2xl font-bold text-slate-900"
              >
                {{ formatRupiah(balance) }}
              </p>
            </div>

            <!-- Income -->
            <div
              class="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
              >
                <ArrowDownToLine :size="21" />
              </div>

              <p class="mt-5 text-sm text-slate-500">
                Uang Masuk
              </p>

              <p
                class="mt-1 break-words text-2xl font-bold text-emerald-600"
              >
                {{ formatRupiah(income) }}
              </p>
            </div>

            <!-- Expense -->
            <div
              class="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"
              >
                <ArrowUpFromLine :size="21" />
              </div>

              <p class="mt-5 text-sm text-slate-500">
                Uang Keluar
              </p>

              <p
                class="mt-1 break-words text-2xl font-bold text-red-600"
              >
                {{ formatRupiah(expense) }}
              </p>
            </div>

            <!-- Monthly balance -->
            <div
              class="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
              >
                <TrendingUp :size="21" />
              </div>

              <p class="mt-5 text-sm text-slate-500">
                Selisih Bulan Ini
              </p>

              <p
                class="mt-1 break-words text-2xl font-bold"
                :class="
                  monthlyBalance >= 0
                    ? 'text-blue-600'
                    : 'text-red-600'
                "
              >
                {{ formatRupiah(monthlyBalance) }}
              </p>
            </div>
          </template>
        </div>

        <!-- Chart + actions -->
        <div
          class="mt-6 grid gap-6 xl:grid-cols-3"
        >
          <!-- Chart -->
          <div
            class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:shadow-lg sm:p-6 xl:col-span-2"
          >
            <div
              class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2
                  class="font-semibold text-slate-900"
                >
                  Ringkasan Keuangan
                </h2>

                <p class="text-sm text-slate-500">
                  Pemasukan dan pengeluaran bulan ini
                </p>
              </div>

              <select
                v-model="selectedMonth"
                class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize text-slate-600 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:w-auto"
              >
                <option
                  v-for="month in monthOptions"
                  :key="month"
                  :value="month"
                >
                  {{ formatMonth(month) }}
                </option>
              </select>
            </div>

            <!-- Chart Content / Skeleton -->
            <div
              class="mt-8 rounded-xl bg-slate-50/70 p-4"
            >
              <div v-if="loading" class="flex h-64 items-end justify-center gap-12 sm:gap-24 animate-pulse">
                <div class="flex h-full w-16 flex-col justify-end sm:w-20 items-center">
                  <div class="h-36 w-10 sm:w-14 rounded-t-xl bg-slate-200"></div>
                  <div class="mt-3 h-3 w-12 rounded bg-slate-200"></div>
                </div>
                <div class="flex h-full w-16 flex-col justify-end sm:w-20 items-center">
                  <div class="h-24 w-10 sm:w-14 rounded-t-xl bg-slate-200"></div>
                  <div class="mt-3 h-3 w-12 rounded bg-slate-200"></div>
                </div>
              </div>

              <div
                v-else
                class="flex h-64 items-end justify-center gap-12 sm:gap-24"
              >
                <!-- Income -->
                <div
                  class="flex h-full w-16 flex-col justify-end sm:w-20"
                >
                  <div
                    class="flex h-full items-end justify-center"
                  >
                    <div
                      class="w-10 rounded-t-xl bg-emerald-400 transition-all duration-500 sm:w-14"
                      :style="{
                        height: incomeHeight,
                      }"
                    ></div>
                  </div>

                  <div class="mt-3 text-center">
                    <p
                      class="text-xs font-medium text-slate-500"
                    >
                      Masuk
                    </p>

                    <p
                      class="mt-1 text-xs font-semibold text-emerald-600"
                    >
                      {{ formatRupiah(income) }}
                    </p>
                  </div>
                </div>

                <!-- Expense -->
                <div
                  class="flex h-full w-16 flex-col justify-end sm:w-20"
                >
                  <div
                    class="flex h-full items-end justify-center"
                  >
                    <div
                      class="w-10 rounded-t-xl bg-red-400 transition-all duration-500 sm:w-14"
                      :style="{
                        height: expenseHeight,
                      }"
                    ></div>
                  </div>

                  <div class="mt-3 text-center">
                    <p
                      class="text-xs font-medium text-slate-500"
                    >
                      Keluar
                    </p>

                    <p
                      class="mt-1 text-xs font-semibold text-red-600"
                    >
                      {{ formatRupiah(expense) }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Empty chart -->
              <div
                v-if="!loading && income === 0 && expense === 0"
                class="mt-2 text-center text-xs text-slate-400"
              >
                Belum ada transaksi pada bulan ini.
              </div>
            </div>
          </div>

          <!-- Quick Action -->
          <div
            class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:shadow-lg sm:p-6"
          >
            <h2
              class="font-semibold text-slate-900"
            >
              Tambah Transaksi
            </h2>

            <p class="mt-1 text-sm text-slate-500">
              Catat transaksi baru.
            </p>

            <div class="mt-6 space-y-3">
              <RouterLink
                to="/income"
                class="group flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-700 transition hover:bg-emerald-100"
              >
                <ArrowDownToLine :size="20" />

                <div>
                  <p class="font-semibold">
                    Uang Masuk
                  </p>

                  <p class="text-xs">
                    Tambahkan pemasukan
                  </p>
                </div>
              </RouterLink>

              <RouterLink
                to="/expense"
                class="group flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-700 transition hover:bg-red-100"
              >
                <ArrowUpFromLine :size="20" />

                <div>
                  <p class="font-semibold">
                    Uang Keluar
                  </p>

                  <p class="text-xs">
                    Tambahkan pengeluaran
                  </p>
                </div>
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- TRANSACTIONS LIST & SKELETON -->
        <div
          class="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition duration-300 hover:shadow-lg"
        >
          <div
            class="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div>
              <h2
                class="font-semibold text-slate-900"
              >
                Transaksi Terakhir
              </h2>

              <p class="text-sm text-slate-500">
                Aktivitas keuangan terbaru
              </p>
            </div>

            <RouterLink
              to="/reports"
              class="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
            >
              Lihat semua
            </RouterLink>
          </div>

          <!-- Skeleton Loading List -->
          <div v-if="loading" class="divide-y divide-slate-100 animate-pulse">
            <div v-for="i in 3" :key="'skeleton-item-' + i" class="flex items-center justify-between p-5">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-xl bg-slate-200"></div>
                <div class="space-y-2">
                  <div class="h-4 w-32 rounded bg-slate-200"></div>
                  <div class="h-3 w-20 rounded bg-slate-200"></div>
                </div>
              </div>
              <div class="h-4 w-24 rounded bg-slate-200"></div>
            </div>
          </div>

          <!-- Empty -->
          <div
            v-else-if="recentTransactions.length === 0"
            class="p-10 text-center"
          >
            <Wallet
              :size="32"
              class="mx-auto text-slate-300"
            />

            <p
              class="mt-3 text-sm font-medium text-slate-600"
            >
              Belum ada transaksi
            </p>

            <p
              class="mt-1 text-xs text-slate-400"
            >
              Tambahkan pemasukan atau pengeluaran
              untuk mulai mencatat keuangan.
            </p>
          </div>

          <!-- List -->
          <div
            v-else
            class="divide-y divide-slate-100"
          >
            <div
              v-for="transaction in recentTransactions"
              :key="transaction.id"
              class="flex flex-col gap-3 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
            >
              <div
                class="flex min-w-0 items-center gap-3"
              >
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  :class="
                    transaction.type === 'income'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-red-50 text-red-600'
                  "
                >
                  <ArrowDownToLine
                    v-if="
                      transaction.type === 'income'
                    "
                    :size="18"
                  />

                  <ArrowUpFromLine
                    v-else
                    :size="18"
                  />
                </div>

                <div class="min-w-0">
                  <p
                    class="truncate text-sm font-semibold text-slate-900"
                  >
                    {{ transaction.description }}
                  </p>

                  <p
                    class="text-xs text-slate-400"
                  >
                    {{ transaction.category }}
                    ·
                    {{
                      formatDate(
                        transaction.transaction_date,
                      )
                    }}
                  </p>
                </div>
              </div>

              <p
                class="pl-13 text-sm font-bold sm:pl-0"
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

                {{
                  formatRupiah(
                    Number(transaction.amount),
                  )
                }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>