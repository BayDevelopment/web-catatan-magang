<script setup lang="ts">
import {
  Users,
  UserCheck,
  ShieldCheck,
  Wallet,
  Activity,
  BarChart3,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  X,
} from 'lucide-vue-next'

import { onMounted, ref } from 'vue'
import DashboardLayout from '../../layouts/DashboardLayout.vue'

import {
  getAdminStats,
  getAdminUsers,
  getAdminTransactions,
  adminCreateTransaction,
  adminUpdateTransaction,
  adminDeleteTransaction,
} from '../../services/admin.service.ts'

import type { AdminStats, UserProfile } from '../../services/admin.service'
import type { Transaction, TransactionFormData } from '../../types/transaction'

const stats = ref<AdminStats>({
  totalUsers: 0,
  activeUsers: 0,
  administrators: 0,
  totalTransactions: 0,
})

const users = ref<UserProfile[]>([])
const transactions = ref<Transaction[]>([])
const activeTab = ref<'overview' | 'users' | 'transactions'>('overview')

const loading = ref(true)
const errorMessage = ref('')

// State Modal CRUD Transaksi
const isModalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const currentTransactionId = ref<number | null>(null)
const formData = ref<TransactionFormData & { user_id: string; type: 'income' | 'expense' }>({
  user_id: '',
  type: 'income',
  description: '',
  category: '',
  amount: 0,
  transaction_date: new Date().toISOString().slice(0, 10),
})

const loadAdminData = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const [statsRes, usersRes, txRes] = await Promise.all([
      getAdminStats(),
      getAdminUsers(),
      getAdminTransactions(),
    ])
    stats.value = statsRes
    users.value = usersRes
    transactions.value = txRes
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Gagal mengambil data admin.'
  } finally {
    loading.value = false
  }
}

// Handler Modal
const openCreateModal = () => {
  modalMode.value = 'create'
  currentTransactionId.value = null
  formData.value = {
    user_id: users.value[0]?.id || '',
    type: 'income',
    description: '',
    category: '',
    amount: 0,
    transaction_date: new Date().toISOString().slice(0, 10),
  }
  isModalOpen.value = true
}

const openEditModal = (tx: Transaction) => {
  modalMode.value = 'edit'
  currentTransactionId.value = tx.id
  formData.value = {
    user_id: tx.user_id,
    type: tx.type,
    description: tx.description,
    category: tx.category,
    amount: Number(tx.amount),
    transaction_date: tx.transaction_date,
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const saveTransaction = async () => {
  try {
    if (modalMode.value === 'create') {
      await adminCreateTransaction(formData.value.user_id, formData.value.type, formData.value)
    } else if (currentTransactionId.value !== null) {
      await adminUpdateTransaction(currentTransactionId.value, formData.value)
    }
    closeModal()
    await loadAdminData()
  } catch (error: any) {
    alert(error.message)
  }
}

const handleDelete = async (id: number) => {
  if (!confirm('Yakin ingin menghapus transaksi ini?')) return
  try {
    await adminDeleteTransaction(id)
    await loadAdminData()
  } catch (error: any) {
    alert(error.message)
  }
}

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

onMounted(() => {
  void loadAdminData()
})
</script>

<template>
  <DashboardLayout
    title="Admin Dashboard"
    subtitle="Monitoring dan pengelolaan sistem"
  >
    <div class="relative overflow-hidden">
      <!-- Background blobs yang diperhalus (lebih lembut & elegan) -->
      <div
        class="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-300/30 blur-[120px] transition-all duration-700"
      ></div>

      <div
        class="pointer-events-none absolute -right-40 top-1/4 h-[450px] w-[450px] rounded-full bg-purple-300/25 blur-[120px] transition-all duration-700"
      ></div>

      <div
        class="pointer-events-none absolute -bottom-32 left-1/3 h-[450px] w-[450px] rounded-full bg-blue-200/30 blur-[120px] transition-all duration-700"
      ></div>

      <div
        class="pointer-events-none absolute bottom-10 right-10 h-80 w-80 rounded-full bg-sky-200/20 blur-[100px] transition-all duration-700"
      ></div>

      <div class="relative z-10">
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

            <div class="flex items-center gap-3 self-start sm:self-auto">
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                @click="openCreateModal"
              >
                <Plus :size="16" />
                Tambah Transaksi
              </button>

              <button
                type="button"
                :disabled="loading"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                @click="loadAdminData"
              >
                <RefreshCw
                  :size="16"
                  :class="loading ? 'animate-spin' : ''"
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="mb-6 flex gap-2 border-b border-slate-200 pb-3">
          <button
            class="rounded-xl px-4 py-2 text-sm font-semibold transition"
            :class="activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white/90 text-slate-600 hover:bg-slate-100'"
            @click="activeTab = 'overview'"
          >
            Ringkasan Statistik
          </button>
          <button
            class="rounded-xl px-4 py-2 text-sm font-semibold transition"
            :class="activeTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white/90 text-slate-600 hover:bg-slate-100'"
            @click="activeTab = 'users'"
          >
            Daftar Pengguna ({{ users.length }})
          </button>
          <button
            class="rounded-xl px-4 py-2 text-sm font-semibold transition"
            :class="activeTab === 'transactions' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white/90 text-slate-600 hover:bg-slate-100'"
            @click="activeTab = 'transactions'"
          >
            Semua Transaksi ({{ transactions.length }})
          </button>
        </div>

        <!-- Error -->
        <div
          v-if="errorMessage"
          class="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ errorMessage }}
        </div>

        <!-- TAB 1: OVERVIEW -->
        <template v-if="activeTab === 'overview'">
          <!-- Loading Skeleton Stats -->
          <div
            v-if="loading"
            class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <div
              v-for="item in 4"
              :key="'skeleton-stat-' + item"
              class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur"
            >
              <div class="h-11 w-11 animate-pulse rounded-xl bg-slate-200"></div>
              <div class="mt-5 h-4 w-24 animate-pulse rounded bg-slate-200"></div>
              <div class="mt-2 h-7 w-16 animate-pulse rounded bg-slate-200"></div>
            </div>
          </div>

          <!-- Stats Content -->
          <div
            v-else
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
              <p class="mt-5 text-sm text-slate-500">Total Pengguna</p>
              <p class="mt-1 text-2xl font-bold text-slate-900">{{ stats.totalUsers }}</p>
              <p class="mt-2 text-xs text-slate-400">Pengguna terdaftar</p>
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
              <p class="mt-5 text-sm text-slate-500">Pengguna Biasa</p>
              <p class="mt-1 text-2xl font-bold text-emerald-600">{{ stats.activeUsers }}</p>
              <p class="mt-2 text-xs text-slate-400">Akun dengan role user</p>
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
              <p class="mt-5 text-sm text-slate-500">Administrator</p>
              <p class="mt-1 text-2xl font-bold text-blue-600">{{ stats.administrators }}</p>
              <p class="mt-2 text-xs text-slate-400">Akun administrator</p>
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
              <p class="mt-5 text-sm text-slate-500">Total Transaksi</p>
              <p class="mt-1 text-2xl font-bold text-violet-600">{{ stats.totalTransactions }}</p>
              <p class="mt-2 text-xs text-slate-400">Seluruh transaksi</p>
            </div>
          </div>
        </template>

        <!-- TAB 2: USERS LIST -->
        <template v-else-if="activeTab === 'users'">
          <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
            <div class="border-b border-slate-200 p-5 sm:p-6">
              <h2 class="font-semibold text-slate-900">Daftar Pengguna Sistem</h2>
              <p class="text-sm text-slate-500">Informasi akun yang terdaftar di aplikasi</p>
            </div>

            <!-- Loading Skeleton Users -->
            <div v-if="loading" class="p-6 space-y-4 animate-pulse">
              <div v-for="i in 3" :key="'skeleton-user-' + i" class="h-12 w-full rounded-xl bg-slate-100"></div>
            </div>

            <div v-else class="divide-y divide-slate-100 overflow-x-auto">
              <table class="w-full text-left text-sm text-slate-600">
                <thead class="bg-slate-50 text-xs uppercase text-slate-700">
                  <tr>
                    <th class="p-4">ID User</th>
                    <th class="p-4">Role</th>
                    <th class="p-4">Tanggal Daftar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="u in users" :key="u.id" class="hover:bg-slate-50/70 transition">
                    <td class="p-4 font-mono text-xs text-slate-900">{{ u.id }}</td>
                    <td class="p-4">
                      <span
                        class="rounded-full px-2.5 py-1 text-xs font-semibold"
                        :class="u.role === 'admin' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'"
                      >
                        {{ u.role }}
                      </span>
                    </td>
                    <td class="p-4">{{ new Date(u.created_at).toLocaleDateString('id-ID') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- TAB 3: TRANSACTIONS LIST (CRUD) -->
        <template v-else-if="activeTab === 'transactions'">
          <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur">
            <div class="border-b border-slate-200 p-5 sm:p-6">
              <h2 class="font-semibold text-slate-900">Kelola Seluruh Transaksi</h2>
              <p class="text-sm text-slate-500">Admin dapat melihat, mengedit, atau menghapus transaksi user</p>
            </div>

            <!-- Loading Skeleton Transactions -->
            <div v-if="loading" class="p-6 space-y-4 animate-pulse">
              <div v-for="i in 3" :key="'skeleton-tx-' + i" class="h-14 w-full rounded-xl bg-slate-100"></div>
            </div>

            <div v-else class="divide-y divide-slate-100 overflow-x-auto">
              <table class="w-full text-left text-sm text-slate-600">
                <thead class="bg-slate-50 text-xs uppercase text-slate-700">
                  <tr>
                    <th class="p-4">Tanggal</th>
                    <th class="p-4">Keterangan</th>
                    <th class="p-4">Kategori</th>
                    <th class="p-4">Tipe</th>
                    <th class="p-4">Jumlah</th>
                    <th class="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="t in transactions" :key="t.id" class="hover:bg-slate-50/70 transition">
                    <td class="p-4">{{ t.transaction_date }}</td>
                    <td class="p-4 font-medium text-slate-900">{{ t.description }}</td>
                    <td class="p-4 capitalize">{{ t.category }}</td>
                    <td class="p-4">
                      <span
                        class="rounded-full px-2.5 py-1 text-xs font-semibold"
                        :class="t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'"
                      >
                        {{ t.type === 'income' ? 'Masuk' : 'Keluar' }}
                      </span>
                    </td>
                    <td class="p-4 font-bold" :class="t.type === 'income' ? 'text-emerald-600' : 'text-red-600'">
                      {{ t.type === 'income' ? '+' : '-' }} {{ formatRupiah(Number(t.amount)) }}
                    </td>
                    <td class="p-4 flex items-center justify-center gap-2">
                      <button
                        class="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                        title="Edit Transaksi"
                        @click="openEditModal(t)"
                      >
                        <Edit :size="16" />
                      </button>
                      <button
                        class="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition"
                        title="Hapus Transaksi"
                        @click="handleDelete(t.id)"
                      >
                        <Trash2 :size="16" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- MODAL FORM TAMBAH / EDIT TRANSAKSI -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 class="text-lg font-bold text-slate-900">
            {{ modalMode === 'create' ? 'Tambah Transaksi Baru' : 'Edit Transaksi' }}
          </h3>
          <button
            type="button"
            class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition"
            @click="closeModal"
          >
            <X :size="20" />
          </button>
        </div>

        <form class="mt-4 space-y-4" @submit.prevent="saveTransaction">
          <!-- Pilih User (Hanya saat create) -->
          <div v-if="modalMode === 'create'">
            <label class="block text-xs font-semibold text-slate-700 uppercase">Pilih Pemilik Akun (User)</label>
            <select
              v-model="formData.user_id"
              class="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              required
            >
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.id }} ({{ u.role }})
              </option>
            </select>
          </div>

          <!-- Tipe Transaksi -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase">Tipe Transaksi</label>
            <select
              v-model="formData.type"
              class="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="income">Uang Masuk (Pemasukan)</option>
              <option value="expense">Uang Keluar (Pengeluaran)</option>
            </select>
          </div>

          <!-- Tanggal -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase">Tanggal</label>
            <input
              v-model="formData.transaction_date"
              type="date"
              class="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>

          <!-- Jumlah -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase">Jumlah Nominal (Rp)</label>
            <input
              v-model.number="formData.amount"
              type="number"
              min="1"
              class="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>

          <!-- Kategori -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase">Kategori</label>
            <input
              v-model="formData.category"
              type="text"
              placeholder="Contoh: Gaji, Makanan, Transport"
              class="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>

          <!-- Keterangan -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase">Keterangan / Deskripsi</label>
            <input
              v-model="formData.description"
              type="text"
              placeholder="Detail transaksi..."
              class="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>

          <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              @click="closeModal"
            >
              Batal
            </button>
            <button
              type="submit"
              class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition shadow-sm"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  </DashboardLayout>
</template>