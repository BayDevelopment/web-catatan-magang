<script setup lang="ts">
import {
  Plus,
  Search,
  Trash2,
  ArrowDownToLine,
  X,
  RefreshCw,
} from "lucide-vue-next";

import { ref, computed, watch, onMounted, onActivated } from "vue";
import DashboardLayout from "../layouts/DashboardLayout.vue";
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
} from "../services/transaction.service";
import type { Transaction } from "../types/transaction";

/* ------------------------------------------------------------------ */
/* Konfigurasi (sama dengan Dashboard)                                  */
/* ------------------------------------------------------------------ */
const PAYDAY = 21;

const SALARY_KEYWORDS = ["gaji", "salary", "payroll"];

const categories = [
  "Gaji",
  "Freelance",
  "Bonus",
  "Investasi",
  "Hadiah",
  "Lainnya",
];

/* ------------------------------------------------------------------ */
/* Helper                                                               */
/* ------------------------------------------------------------------ */
const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const normalizeDate = (value: unknown): string => {
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}[T ]/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : toISO(parsed);
};

const amountOf = (t: Transaction) => {
  const n = Number(t.amount);
  return Number.isFinite(n) ? Math.max(n, 0) : 0;
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));

/** Deteksi gaji dari kategori dan keterangan (untuk form). */
const detectSalary = (cat: string, desc: string) => {
  const text = `${cat} ${desc}`.toLowerCase();
  return SALARY_KEYWORDS.some((keyword) => text.includes(keyword));
};

/** Aturan sama dengan Dashboard: flag database dulu, baru tebakan. */
const isSalary = (t: Transaction) => {
  if (t.type !== "income") return false;
  if (t.is_salary === true) return true;
  if (t.is_salary === false) return false;
  return detectSalary(String(t.category ?? ""), String(t.description ?? ""));
};

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */
const transactions = ref<Transaction[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const now = ref(new Date());

const showForm = ref(false);
const search = ref("");

const description = ref("");
const category = ref("Gaji");
const amount = ref<number | null>(null);
// Tanggal lokal (bukan UTC) agar tidak mundur sehari di dini hari WIB.
const date = ref(toISO(new Date()));
const isSalaryChecked = ref(true);
const salaryTouched = ref(false);
const formError = ref("");
const submitting = ref(false);

// Centang "gaji" otomatis mengikuti kategori/keterangan,
// kecuali sudah diubah manual oleh pengguna.
watch([description, category], () => {
  if (!salaryTouched.value) {
    isSalaryChecked.value = detectSalary(category.value, description.value);
  }
});

/* ------------------------------------------------------------------ */
/* Periode gajian aktif                                                 */
/* ------------------------------------------------------------------ */
const period = computed(() => {
  const today = new Date(
    now.value.getFullYear(),
    now.value.getMonth(),
    now.value.getDate(),
  );

  const start =
    today.getDate() >= PAYDAY
      ? new Date(today.getFullYear(), today.getMonth(), PAYDAY)
      : new Date(today.getFullYear(), today.getMonth() - 1, PAYDAY);

  const next = new Date(start.getFullYear(), start.getMonth() + 1, PAYDAY);
  const end = new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1);

  return { start: toISO(start), end: toISO(end) };
});

/* ------------------------------------------------------------------ */
/* Load data                                                            */
/* ------------------------------------------------------------------ */
const loadIncomes = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const data = await getTransactions();

    // Hanya ambil transaksi bertipe income (pemasukan)
    transactions.value = data
      .filter((t) => t.type === "income")
      .map((t) => ({
        ...t,
        transaction_date: normalizeDate(t.transaction_date),
        amount: amountOf(t),
      }))
      .filter((t) => t.transaction_date !== "");

    now.value = new Date();
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data pemasukan.";
  } finally {
    loading.value = false;
  }
};

/* ------------------------------------------------------------------ */
/* Data tampilan                                                        */
/* ------------------------------------------------------------------ */
const filteredIncomes = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  return transactions.value
    .filter((item) => {
      const descriptionText = String(item.description ?? "").toLowerCase();
      const categoryText = String(item.category ?? "").toLowerCase();
      return (
        descriptionText.includes(keyword) || categoryText.includes(keyword)
      );
    })
    .sort(
      (a, b) =>
        b.transaction_date.localeCompare(a.transaction_date) ||
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );
});

const totalIncome = computed(() =>
  transactions.value.reduce((total, item) => total + amountOf(item), 0),
);

const periodIncomes = computed(() =>
  transactions.value.filter(
    (t) =>
      t.transaction_date >= period.value.start &&
      t.transaction_date <= period.value.end,
  ),
);

const periodTotal = computed(() =>
  periodIncomes.value.reduce((total, t) => total + amountOf(t), 0),
);

const periodSalary = computed(() =>
  periodIncomes.value
    .filter(isSalary)
    .reduce((total, t) => total + amountOf(t), 0),
);

const periodLabel = computed(
  () => `${formatDate(period.value.start)} – ${formatDate(period.value.end)}`,
);

const dateNote = computed(() => {
  if (!date.value) return "";
  if (date.value > period.value.end) {
    return "Tanggal ini masuk periode gajian berikutnya, jadi belum dihitung sebagai dana periode sekarang.";
  }
  if (date.value < period.value.start) {
    return "Tanggal ini masuk periode gajian sebelumnya, jadi tidak menambah dana periode sekarang.";
  }
  return "";
});

/* ------------------------------------------------------------------ */
/* Form                                                                 */
/* ------------------------------------------------------------------ */
const resetForm = () => {
  description.value = "";
  category.value = "Gaji";
  amount.value = null;
  date.value = toISO(new Date());
  isSalaryChecked.value = true;
  salaryTouched.value = false;
  formError.value = "";
};

const openForm = () => {
  resetForm();
  showForm.value = true;
};

const saveIncome = async () => {
  if (submitting.value) return;

  const cleanDescription = description.value.trim();
  const nominal = Number(amount.value);

  if (
    !cleanDescription ||
    amount.value === null ||
    !Number.isFinite(nominal) ||
    nominal <= 0
  ) {
    formError.value = "Mohon isi keterangan dan nominal dengan benar.";
    return;
  }

  if (!date.value) {
    formError.value = "Mohon pilih tanggal pemasukan.";
    return;
  }

  submitting.value = true;
  formError.value = "";
  errorMessage.value = "";

  try {
    await createTransaction("income", {
      description: cleanDescription,
      category: category.value,
      amount: Math.round(nominal),
      transaction_date: date.value,
      is_salary: isSalaryChecked.value,
    });

    showForm.value = false;
    resetForm();

    // Muat ulang data terbaru dari Supabase
    await loadIncomes();
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : "Gagal menyimpan pemasukan.";
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async (id: number) => {
  if (!confirm("Yakin ingin menghapus pemasukan ini?")) return;

  errorMessage.value = "";

  try {
    await deleteTransaction(id);
    await loadIncomes();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Gagal menghapus pemasukan.";
  }
};

/* ------------------------------------------------------------------ */
/* Lifecycle                                                            */
/* ------------------------------------------------------------------ */
let hasBeenActivated = false;

onMounted(() => {
  void loadIncomes();
});

onActivated(() => {
  // Muat ulang saat halaman KeepAlive diaktifkan kembali.
  if (hasBeenActivated) {
    void loadIncomes();
  } else {
    hasBeenActivated = true;
  }
});
</script>

<template>
  <DashboardLayout title="Uang Masuk" subtitle="Kelola semua pemasukan kamu">
    <!-- Main wrapper -->
    <div class="relative">
      <!-- Background blobs: langsung di body, fixed, di belakang semua konten -->
      <Teleport to="body">
        <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div
            class="absolute -top-40 -left-40 h-[500px] w-[500px] transform-gpu rounded-full bg-emerald-300/30 blur-[120px]"
          ></div>
          <div
            class="absolute -right-40 top-1/4 h-[450px] w-[450px] transform-gpu rounded-full bg-indigo-300/25 blur-[120px]"
          ></div>
          <div
            class="absolute -bottom-32 left-1/3 h-[450px] w-[450px] transform-gpu rounded-full bg-blue-200/30 blur-[120px]"
          ></div>
          <div
            class="absolute bottom-10 right-10 h-80 w-80 transform-gpu rounded-full bg-teal-200/20 blur-[100px]"
          ></div>
        </div>
      </Teleport>

      <!-- Content -->
      <div class="relative z-10">
        <!-- Actions (judul & subjudul sudah ada di AppHeader) -->
        <div class="mb-6 flex justify-end">
          <div class="flex items-center gap-3">
            <button
              type="button"
              :disabled="loading"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              @click="loadIncomes"
            >
              <RefreshCw :size="16" :class="loading ? 'animate-spin' : ''" />
              Refresh
            </button>

            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
              @click="openForm"
            >
              <Plus :size="18" />
              Tambah Pemasukan
            </button>
          </div>
        </div>

        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {{ errorMessage }}
        </div>

        <!-- Summary -->
        <div
          class="mb-6 overflow-hidden rounded-2xl border border-emerald-100/80 bg-emerald-50/90 p-6 shadow-sm backdrop-blur transition duration-300 hover:shadow-md"
        >
          <div class="flex items-center gap-4">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm"
            >
              <ArrowDownToLine :size="21" />
            </div>

            <div>
              <p class="text-sm text-emerald-700">Pemasukan periode ini</p>

              <p class="mt-1 text-2xl font-bold text-emerald-700 sm:text-3xl">
                {{ formatRupiah(periodTotal) }}
              </p>
            </div>
          </div>

          <div
            class="mt-4 grid gap-2 border-t border-emerald-100 pt-4 text-xs text-emerald-700/80 sm:grid-cols-3"
          >
            <p>Periode {{ periodLabel }}</p>
            <p>
              Gaji
              <span class="font-semibold">{{
                formatRupiah(periodSalary)
              }}</span>
            </p>
            <p class="sm:text-right">
              Semua waktu
              <span class="font-semibold">{{ formatRupiah(totalIncome) }}</span>
            </p>
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
              placeholder="Cari pemasukan..."
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
              <thead class="border-b border-slate-200 bg-slate-50/80">
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

              <!-- Skeleton Loading -->
              <tbody
                v-if="loading"
                class="animate-pulse divide-y divide-slate-100"
              >
                <tr v-for="i in 3" :key="'skeleton-income-' + i">
                  <td class="px-6 py-4">
                    <div class="h-4 w-40 rounded bg-slate-200"></div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="h-4 w-28 rounded bg-slate-200"></div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="h-4 w-24 rounded bg-slate-200"></div>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="ml-auto h-4 w-24 rounded bg-slate-200"></div>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="ml-auto h-8 w-8 rounded-lg bg-slate-200"></div>
                  </td>
                </tr>
              </tbody>

              <!-- Table Content -->
              <tbody v-else class="divide-y divide-slate-100">
                <tr
                  v-for="item in filteredIncomes"
                  :key="item.id"
                  class="transition hover:bg-slate-50/70"
                >
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
                      >
                        <ArrowDownToLine :size="18" />
                      </div>

                      <span class="font-medium text-slate-900">
                        {{ item.description }}
                      </span>

                      <span
                        v-if="isSalary(item)"
                        class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600"
                      >
                        Gaji
                      </span>
                    </div>
                  </td>

                  <td class="px-6 py-4 text-sm text-slate-600">
                    {{ item.category }}
                  </td>

                  <td class="px-6 py-4 text-sm text-slate-600">
                    {{ formatDate(item.transaction_date) }}
                  </td>

                  <td
                    class="px-6 py-4 text-right font-semibold text-emerald-600"
                  >
                    +{{ formatRupiah(amountOf(item)) }}
                  </td>

                  <td class="px-6 py-4">
                    <div class="flex justify-end gap-2">
                      <button
                        type="button"
                        class="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Hapus"
                        @click="handleDelete(item.id)"
                      >
                        <Trash2 :size="17" />
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Empty state -->
                <tr v-if="filteredIncomes.length === 0">
                  <td colspan="5" class="px-6 py-12 text-center">
                    <div
                      class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"
                    >
                      <Search :size="21" />
                    </div>

                    <p class="mt-3 text-sm font-medium text-slate-700">
                      Pemasukan tidak ditemukan
                    </p>

                    <p class="mt-1 text-xs text-slate-400">
                      Coba gunakan kata kunci pencarian lain atau tambahkan
                      pemasukan baru.
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
      @keydown.esc="showForm = false"
    >
      <div
        class="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
      >
        <!-- Modal blobs -->
        <div
          class="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-indigo-100/50 blur-3xl"
        ></div>

        <div class="relative">
          <!-- Modal header -->
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <div
                class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
              >
                <ArrowDownToLine :size="19" />
              </div>

              <h2 class="text-xl font-bold text-slate-900">Tambah Pemasukan</h2>

              <p class="mt-1 text-sm text-slate-500">Catat uang yang masuk.</p>
            </div>

            <button
              type="button"
              class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="Tutup"
              @click="showForm = false"
            >
              <X :size="19" />
            </button>
          </div>

          <!-- Form -->
          <form class="space-y-4" @submit.prevent="saveIncome">
            <p
              v-if="formError"
              class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {{ formError }}
            </p>

            <!-- Description -->
            <div>
              <label
                for="income-description"
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Keterangan
              </label>

              <input
                id="income-description"
                v-model="description"
                placeholder="Contoh: Gaji Bulanan"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                required
              />
            </div>

            <!-- Category -->
            <div>
              <label
                for="income-category"
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Kategori
              </label>

              <select
                id="income-category"
                v-model="category"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option v-for="item in categories" :key="item" :value="item">
                  {{ item }}
                </option>
              </select>
            </div>

            <!-- Gaji -->
            <label
              class="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
            >
              <input
                v-model="isSalaryChecked"
                type="checkbox"
                class="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                @change="salaryTouched = true"
              />
              <span>
                <span class="block text-sm font-medium text-slate-700">
                  Ini gaji
                </span>
                <span class="block text-xs text-slate-500">
                  Dipakai Dashboard untuk menandai gaji yang menjadi dasar jatah
                  harian sampai tanggal {{ PAYDAY - 1 }}.
                </span>
              </span>
            </label>

            <!-- Amount -->
            <div>
              <label
                for="income-amount"
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Nominal
              </label>

              <input
                id="income-amount"
                v-model.number="amount"
                type="number"
                min="1"
                step="1"
                placeholder="5000000"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                required
              />
            </div>

            <!-- Date -->
            <div>
              <label
                for="income-date"
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Tanggal
              </label>

              <input
                id="income-date"
                v-model="date"
                type="date"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                required
              />

              <p v-if="dateNote" class="mt-2 text-xs text-amber-600">
                {{ dateNote }}
              </p>
            </div>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="submitting"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                v-if="submitting"
                class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              ></span>
              {{ submitting ? "Menyimpan..." : "Simpan Pemasukan" }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>
