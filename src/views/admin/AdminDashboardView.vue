<script setup lang="ts">
import {
  Users,
  UserCheck,
  ShieldCheck,
  Wallet,
  ArrowRight,
  Activity,
  BarChart3,
  RefreshCw,
} from 'lucide-vue-next'

import {
  onMounted,
  ref,
} from 'vue'

import DashboardLayout from '../../layouts/DashboardLayout.vue'
import {
  getAdminStats,
} from '../../services/admin.service'

import type {
  AdminStats,
} from '../../services/admin.service'

const stats = ref<AdminStats>({
  totalUsers: 0,
  activeUsers: 0,
  administrators: 0,
  totalTransactions: 0,
})

const loading = ref(true)
const errorMessage = ref('')

const loadStats = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    stats.value = await getAdminStats()
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Gagal mengambil data statistik admin.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadStats()
})
</script>

<template>
  <DashboardLayout
    title="Admin Dashboard"
    subtitle="Monitoring dan pengelolaan sistem"
  >
    <div class="relative overflow-hidden">

      <!-- Background -->
      <div
        class="pointer-events-none absolute -left-24 -top-20 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl"
      ></div>

      <div
        class="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl"
      ></div>

      <div
        class="pointer-events-none absolute bottom-20 left-1/3 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl"
      ></div>

      <div class="relative">

        <!-- Header -->
        <div class="mb-8">
          <div
            class="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-xs font-medium text-indigo-600 shadow-sm backdrop-blur"
          >
            <ShieldCheck :size="14" />
            Administrator
          </div>

          <div
            class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <h1
                class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
              >
                Admin Dashboard
              </h1>

              <p
                class="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base"
              >
                Kelola pengguna dan pantau aktivitas aplikasi
                melalui panel administrator.
              </p>
            </div>

            <button
              type="button"
              :disabled="loading"
              class="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
              @click="loadStats"
            >
              <RefreshCw
                :size="16"
                :class="loading ? 'animate-spin' : ''"
              />

              Refresh
            </button>
          </div>
        </div>

        <!-- Error -->
        <div
          v-if="errorMessage"
          class="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ errorMessage }}
        </div>

        <!-- Loading -->
        <div
          v-if="loading"
          class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <div
            v-for="item in 4"
            :key="item"
            class="h-36 animate-pulse rounded-2xl bg-white/70"
          ></div>
        </div>

        <!-- Content -->
        <template v-else>

          <!-- Stats -->
          <div
            class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >

            <!-- Total Users -->
            <div
              class="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div class="flex items-center justify-between">
                <div
                  class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
                >
                  <Users :size="21" />
                </div>

                <Activity
                  :size="17"
                  class="text-slate-300 transition group-hover:text-indigo-400"
                />
              </div>

              <p class="mt-5 text-sm text-slate-500">
                Total Pengguna
              </p>

              <p class="mt-1 text-2xl font-bold text-slate-900">
                {{ stats.totalUsers }}
              </p>

              <p class="mt-2 text-xs text-slate-400">
                Pengguna terdaftar
              </p>
            </div>

            <!-- Regular Users -->
            <div
              class="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div class="flex items-center justify-between">
                <div
                  class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
                >
                  <UserCheck :size="21" />
                </div>

                <Activity
                  :size="17"
                  class="text-slate-300 transition group-hover:text-emerald-400"
                />
              </div>

              <p class="mt-5 text-sm text-slate-500">
                Pengguna Biasa
              </p>

              <p class="mt-1 text-2xl font-bold text-emerald-600">
                {{ stats.activeUsers }}
              </p>

              <p class="mt-2 text-xs text-slate-400">
                Akun dengan role user
              </p>
            </div>

            <!-- Administrators -->
            <div
              class="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div class="flex items-center justify-between">
                <div
                  class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
                >
                  <ShieldCheck :size="21" />
                </div>

                <BarChart3
                  :size="17"
                  class="text-slate-300 transition group-hover:text-blue-400"
                />
              </div>

              <p class="mt-5 text-sm text-slate-500">
                Administrator
              </p>

              <p class="mt-1 text-2xl font-bold text-blue-600">
                {{ stats.administrators }}
              </p>

              <p class="mt-2 text-xs text-slate-400">
                Akun administrator
              </p>
            </div>

            <!-- Transactions -->
            <div
              class="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div class="flex items-center justify-between">
                <div
                  class="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"
                >
                  <Wallet :size="21" />
                </div>

                <BarChart3
                  :size="17"
                  class="text-slate-300 transition group-hover:text-violet-400"
                />
              </div>

              <p class="mt-5 text-sm text-slate-500">
                Total Transaksi
              </p>

              <p class="mt-1 text-2xl font-bold text-violet-600">
                {{ stats.totalTransactions }}
              </p>

              <p class="mt-2 text-xs text-slate-400">
                Seluruh transaksi
              </p>
            </div>

          </div>

          <!-- Management -->
          <div class="mt-6 grid gap-6 lg:grid-cols-2">

            <!-- Users -->
            <div
              class="group rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur transition duration-300 hover:shadow-lg sm:p-7"
            >
              <div class="flex gap-4">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
                >
                  <Users :size="22" />
                </div>

                <div>
                  <h2 class="font-semibold text-slate-900">
                    Pengguna
                  </h2>

                  <p class="mt-1 text-sm leading-6 text-slate-500">
                    Lihat pengguna yang terdaftar dan informasi
                    akun mereka.
                  </p>
                </div>
              </div>

              <button
                type="button"
                class="mt-6 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <span>
                  Kelola pengguna
                </span>

                <ArrowRight
                  :size="18"
                  class="transition-transform group-hover:translate-x-1"
                />
              </button>
            </div>

            <!-- Transactions -->
            <div
              class="group rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur transition duration-300 hover:shadow-lg sm:p-7"
            >
              <div class="flex gap-4">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"
                >
                  <Wallet :size="22" />
                </div>

                <div>
                  <h2 class="font-semibold text-slate-900">
                    Transaksi
                  </h2>

                  <p class="mt-1 text-sm leading-6 text-slate-500">
                    Pantau aktivitas transaksi yang tersimpan
                    dalam sistem.
                  </p>
                </div>
              </div>

              <button
                type="button"
                class="mt-6 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
              >
                <span>
                  Lihat transaksi
                </span>

                <ArrowRight
                  :size="18"
                  class="transition-transform group-hover:translate-x-1"
                />
              </button>
            </div>

          </div>

          <!-- Security -->
          <div
            class="mt-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm sm:p-7"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start">

              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm"
              >
                <ShieldCheck :size="21" />
              </div>

              <div>
                <h2 class="font-semibold text-slate-900">
                  Akses Administrator
                </h2>

                <p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  Halaman ini hanya dapat diakses oleh akun
                  dengan role administrator. Hak akses dikontrol
                  melalui sistem autentikasi dan role pengguna.
                </p>
              </div>

            </div>
          </div>

        </template>
      </div>
    </div>
  </DashboardLayout>
</template>