<script setup lang="ts">
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  TrendingUp,
} from 'lucide-vue-next'

import DashboardLayout from '../layouts/DashboardLayout.vue'

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

const balance = 3650000
const income = 5000000
const expense = 1350000

const transactions = [
  {
    description: 'Gaji Bulanan',
    category: 'Gaji',
    type: 'income',
    amount: 5000000,
    date: '01 Sep 2026',
  },
  {
    description: 'Beli Gorengan',
    category: 'Makanan',
    type: 'expense',
    amount: 24000,
    date: '02 Sep 2026',
  },
  {
    description: 'Bensin',
    category: 'Transportasi',
    type: 'expense',
    amount: 50000,
    date: '03 Sep 2026',
  },
  {
    description: 'Makan Siang',
    category: 'Makanan',
    type: 'expense',
    amount: 25000,
    date: '04 Sep 2026',
  },
]
</script>

<template>
  <DashboardLayout
    title="Dashboard"
    subtitle="Ringkasan keuangan kamu"
  >
    <!-- Main wrapper + blobs -->
    <div class="relative overflow-hidden">

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

      <!-- Content -->
      <div class="relative">

        <!-- Header -->
        <div class="mb-8">
          <p class="text-sm text-slate-500">
            September 2026
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

        <!-- Cards -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <!-- Saldo -->
          <div
            class="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div class="flex items-center justify-between">
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
              >
                <Wallet :size="21" />
              </div>
            </div>

            <p class="mt-5 text-sm text-slate-500">
              Saldo
            </p>

            <p class="mt-1 text-2xl font-bold text-slate-900">
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

            <p class="mt-1 text-2xl font-bold text-emerald-600">
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

            <p class="mt-1 text-2xl font-bold text-red-600">
              {{ formatRupiah(expense) }}
            </p>
          </div>

          <!-- Saving -->
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

            <p class="mt-1 text-2xl font-bold text-blue-600">
              {{ formatRupiah(income - expense) }}
            </p>
          </div>

        </div>

        <!-- Content -->
        <div class="mt-6 grid gap-6 xl:grid-cols-3">

          <!-- Chart -->
          <div
            class="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur transition duration-300 hover:shadow-lg xl:col-span-2"
          >
            <div
              class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 class="font-semibold text-slate-900">
                  Ringkasan Keuangan
                </h2>

                <p class="text-sm text-slate-500">
                  Pemasukan dan pengeluaran bulan ini
                </p>
              </div>

              <select
                class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:w-auto"
              >
                <option>September 2026</option>
                <option>Agustus 2026</option>
                <option>Juli 2026</option>
              </select>
            </div>

            <div
              class="mt-8 flex h-64 items-end justify-around gap-3"
            >
              <!-- Income bar -->
              <div
                class="flex h-full flex-col justify-end"
              >
                <div
                  class="w-10 rounded-t-lg bg-emerald-400 transition-all duration-500 hover:bg-emerald-500 sm:w-12"
                  style="height: 65%"
                ></div>

                <span class="mt-2 text-xs text-slate-400">
                  Masuk
                </span>
              </div>

              <!-- Expense bar -->
              <div
                class="flex h-full flex-col justify-end"
              >
                <div
                  class="w-10 rounded-t-lg bg-red-400 transition-all duration-500 hover:bg-red-500 sm:w-12"
                  style="height: 35%"
                ></div>

                <span class="mt-2 text-xs text-slate-400">
                  Keluar
                </span>
              </div>
            </div>
          </div>

          <!-- Quick Action -->
          <div
            class="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur transition duration-300 hover:shadow-lg"
          >
            <h2 class="font-semibold text-slate-900">
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

        <!-- Transactions -->
        <div
          class="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition duration-300 hover:shadow-lg"
        >
          <div
            class="flex flex-col gap-3 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 class="font-semibold text-slate-900">
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

          <div class="divide-y divide-slate-100">

            <div
              v-for="transaction in transactions"
              :key="transaction.description"
              class="flex flex-col gap-3 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
            >

              <div class="flex items-center gap-3">

                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  :class="
                    transaction.type === 'income'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-red-50 text-red-600'
                  "
                >
                  <ArrowDownToLine
                    v-if="transaction.type === 'income'"
                    :size="18"
                  />

                  <ArrowUpFromLine
                    v-else
                    :size="18"
                  />
                </div>

                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-900">
                    {{ transaction.description }}
                  </p>

                  <p class="text-xs text-slate-400">
                    {{ transaction.category }} · {{ transaction.date }}
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
                {{ transaction.type === 'income' ? '+' : '-' }}
                {{ formatRupiah(transaction.amount) }}
              </p>

            </div>

          </div>
        </div>

      </div>
    </div>
  </DashboardLayout>
</template>