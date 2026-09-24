<script setup lang="ts">
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpFromLine,
  X,
} from 'lucide-vue-next'

import { ref, computed } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'

interface Expense {
  id: number
  description: string
  category: string
  amount: number
  date: string
}

const showForm = ref(false)
const search = ref('')

const description = ref('')
const category = ref('Makanan')
const amount = ref<number | null>(null)
const date = ref('2026-09-24')

const expenses = ref<Expense[]>([
  {
    id: 1,
    description: 'Beli Gorengan',
    category: 'Makanan',
    amount: 24000,
    date: '2026-09-02',
  },
  {
    id: 2,
    description: 'Bensin',
    category: 'Transportasi',
    amount: 50000,
    date: '2026-09-03',
  },
  {
    id: 3,
    description: 'Makan Siang',
    category: 'Makanan',
    amount: 25000,
    date: '2026-09-04',
  },
])

const formatRupiah = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

const filteredExpenses = computed(() => {
  return expenses.value.filter((item) =>
    item.description
      .toLowerCase()
      .includes(search.value.toLowerCase())
  )
})

const totalExpense = computed(() => {
  return expenses.value.reduce(
    (total, item) => total + item.amount,
    0
  )
})

const saveExpense = () => {
  if (!description.value || !amount.value) {
    return
  }

  expenses.value.unshift({
    id: Date.now(),
    description: description.value,
    category: category.value,
    amount: amount.value,
    date: date.value,
  })

  description.value = ''
  amount.value = null
  category.value = 'Makanan'

  showForm.value = false
}

const deleteExpense = (id: number) => {
  expenses.value = expenses.value.filter(
    (item) => item.id !== id
  )
}
</script>

<template>
  <DashboardLayout
    title="Uang Keluar"
    subtitle="Kelola semua pengeluaran kamu"
  >
    <!-- Main wrapper -->
    <div class="relative overflow-hidden">

      <!-- Blobs -->
      <div
        class="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-red-200/30 blur-3xl"
      ></div>

      <div
        class="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl"
      ></div>

      <div
        class="pointer-events-none absolute left-1/3 top-[45%] h-64 w-64 rounded-full bg-violet-200/25 blur-3xl"
      ></div>

      <div
        class="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-red-100/40 blur-3xl"
      ></div>

      <!-- Content -->
      <div class="relative">

        <!-- Header -->
        <div
          class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
        >
          <div>
            <p class="text-sm text-slate-500">
              Keuangan
            </p>

            <h1
              class="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            >
              Uang Keluar
            </h1>

            <p class="mt-1 text-sm text-slate-500">
              Kelola seluruh pengeluaran kamu.
            </p>
          </div>

          <button
            type="button"
            @click="showForm = true"
            class="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md"
          >
            <Plus :size="18" />
            Tambah Pengeluaran
          </button>
        </div>

        <!-- Summary -->
        <div
          class="mb-6 overflow-hidden rounded-2xl border border-red-100/80 bg-red-50/90 p-6 shadow-sm backdrop-blur transition duration-300 hover:shadow-md"
        >
          <div class="flex items-center gap-4">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm"
            >
              <ArrowUpFromLine :size="21" />
            </div>

            <div>
              <p class="text-sm text-red-700">
                Total pengeluaran
              </p>

              <p class="mt-1 text-2xl font-bold text-red-700 sm:text-3xl">
                {{ formatRupiah(totalExpense) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Search -->
        <div class="mb-4">
          <div class="relative w-full sm:max-w-md">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              :size="18"
            />

            <input
              v-model="search"
              type="text"
              placeholder="Cari pengeluaran..."
              class="w-full rounded-xl border border-slate-200 bg-white/90 py-3 pl-10 pr-4 text-sm shadow-sm outline-none backdrop-blur transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <!-- Table -->
        <div
          class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition duration-300 hover:shadow-lg"
        >
          <div class="overflow-x-auto">
            <table class="w-full min-w-[700px]">

              <thead
                class="border-b border-slate-200 bg-slate-50/80"
              >
                <tr>
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
                    Tanggal
                  </th>

                  <th
                    class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Nominal
                  </th>

                  <th
                    class="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="item in filteredExpenses"
                  :key="item.id"
                  class="transition hover:bg-slate-50/70"
                >
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"
                      >
                        <ArrowUpFromLine :size="18" />
                      </div>

                      <span class="font-medium text-slate-900">
                        {{ item.description }}
                      </span>
                    </div>
                  </td>

                  <td class="px-6 py-4 text-sm text-slate-600">
                    {{ item.category }}
                  </td>

                  <td class="px-6 py-4 text-sm text-slate-600">
                    {{ item.date }}
                  </td>

                  <td
                    class="px-6 py-4 text-right font-semibold text-red-600"
                  >
                    -{{ formatRupiah(item.amount) }}
                  </td>

                  <td class="px-6 py-4">
                    <div class="flex justify-end gap-2">
                      <button
                        type="button"
                        class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                        title="Edit"
                      >
                        <Pencil :size="17" />
                      </button>

                      <button
                        type="button"
                        @click="deleteExpense(item.id)"
                        class="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Hapus"
                      >
                        <Trash2 :size="17" />
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Empty state -->
                <tr v-if="filteredExpenses.length === 0">
                  <td
                    colspan="5"
                    class="px-6 py-12 text-center"
                  >
                    <div
                      class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"
                    >
                      <Search :size="21" />
                    </div>

                    <p
                      class="mt-3 text-sm font-medium text-slate-700"
                    >
                      Pengeluaran tidak ditemukan
                    </p>

                    <p class="mt-1 text-xs text-slate-400">
                      Coba gunakan kata kunci pencarian lain.
                    </p>
                  </td>
                </tr>
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </div>

    <!-- Modal -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
      @click.self="showForm = false"
    >
      <div
        class="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
      >

        <!-- Modal blobs -->
        <div
          class="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-red-100/60 blur-3xl"
        ></div>

        <div
          class="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-indigo-100/50 blur-3xl"
        ></div>

        <div class="relative">

          <!-- Modal header -->
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <div
                class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600"
              >
                <ArrowUpFromLine :size="19" />
              </div>

              <h2 class="text-xl font-bold text-slate-900">
                Tambah Pengeluaran
              </h2>

              <p class="mt-1 text-sm text-slate-500">
                Catat uang yang keluar.
              </p>
            </div>

            <button
              type="button"
              @click="showForm = false"
              class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="Tutup"
            >
              <X :size="19" />
            </button>
          </div>

          <!-- Form -->
          <form
            class="space-y-4"
            @submit.prevent="saveExpense"
          >

            <!-- Description -->
            <div>
              <label
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Keterangan
              </label>

              <input
                v-model="description"
                placeholder="Contoh: Beli Gorengan"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <!-- Category -->
            <div>
              <label
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Kategori
              </label>

              <select
                v-model="category"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              >
                <option>Makanan</option>
                <option>Transportasi</option>
                <option>Belanja</option>
                <option>Tagihan</option>
                <option>Hiburan</option>
                <option>Kesehatan</option>
                <option>Pendidikan</option>
                <option>Lainnya</option>
              </select>
            </div>

            <!-- Amount -->
            <div>
              <label
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Nominal
              </label>

              <input
                v-model.number="amount"
                type="number"
                min="1"
                placeholder="24000"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <!-- Date -->
            <div>
              <label
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Tanggal
              </label>

              <input
                v-model="date"
                type="date"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <!-- Submit -->
            <button
              type="submit"
              class="w-full rounded-xl bg-red-600 py-3 font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md"
            >
              Simpan Pengeluaran
            </button>

          </form>
        </div>
      </div>
    </div>

  </DashboardLayout>
</template>