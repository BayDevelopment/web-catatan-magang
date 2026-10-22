<script setup lang="ts">
import {
  Users,
  UserCheck,
  ShieldCheck,
  Wallet,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";

import DashboardLayout from "../../layouts/DashboardLayout.vue";
import {
  getAdminStats,
  getAdminUsers,
  getAdminTransactions,
  adminCreateTransaction,
  adminUpdateTransaction,
  adminDeleteTransaction,
} from "../../services/admin.service";

import type { AdminStats, UserProfile } from "../../services/admin.service";
import type { Transaction, TransactionFormData } from "../../types/transaction";

/* ------------------------------------------------------------------ */
/* Konfigurasi                                                         */
/* ------------------------------------------------------------------ */

type TabKey = "overview" | "users" | "transactions";
type TxForm = TransactionFormData & {
  user_id: string;
  type: "income" | "expense";
};

const TX_PER_PAGE = 8;

const inputCls =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = (userId = ""): TxForm => ({
  user_id: userId,
  type: "income",
  description: "",
  category: "",
  amount: 0,
  transaction_date: todayISO(),
});

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const stats = ref<AdminStats>({
  totalUsers: 0,
  activeUsers: 0,
  administrators: 0,
  totalTransactions: 0,
});
const users = ref<UserProfile[]>([]);
const transactions = ref<Transaction[]>([]);

const activeTab = ref<TabKey>("overview");
const loading = ref(true);
const errorMessage = ref("");

// Modal
const isModalOpen = ref(false);
const modalMode = ref<"create" | "edit">("create");
const currentTransactionId = ref<number | null>(null);
const formData = ref<TxForm>(emptyForm());
const saving = ref(false);
const modalError = ref("");

// Pagination transaksi
const txPage = ref(1);

/* ------------------------------------------------------------------ */
/* Format                                                              */
/* ------------------------------------------------------------------ */

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatDate = (date: string) => {
  const parsed = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const formatDateTime = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const shortId = (id: string) => `${id.slice(0, 8)}…`;

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/* ------------------------------------------------------------------ */
/* Data tampilan                                                       */
/* ------------------------------------------------------------------ */

const statCards = computed(() => [
  {
    key: "total",
    label: "Total pengguna",
    value: stats.value.totalUsers,
    hint: "Semua akun terdaftar",
    icon: Users,
    iconCls: "bg-indigo-50 text-indigo-600",
    valueCls: "text-slate-900",
  },
  {
    key: "users",
    label: "Pengguna biasa",
    value: stats.value.activeUsers,
    hint: "Akun dengan role user",
    icon: UserCheck,
    iconCls: "bg-emerald-50 text-emerald-600",
    valueCls: "text-emerald-600",
  },
  {
    key: "admins",
    label: "Administrator",
    value: stats.value.administrators,
    hint: "Akun dengan role admin",
    icon: ShieldCheck,
    iconCls: "bg-blue-50 text-blue-600",
    valueCls: "text-blue-600",
  },
  {
    key: "tx",
    label: "Total transaksi",
    value: stats.value.totalTransactions,
    hint: "Seluruh transaksi user",
    icon: Wallet,
    iconCls: "bg-violet-50 text-violet-600",
    valueCls: "text-violet-600",
  },
]);

const tabs = computed<{ key: TabKey; label: string; count?: number }[]>(() => [
  { key: "overview", label: "Ringkasan" },
  { key: "users", label: "Pengguna", count: users.value.length },
  { key: "transactions", label: "Transaksi", count: transactions.value.length },
]);

const totalTxPages = computed(() =>
  Math.max(Math.ceil(transactions.value.length / TX_PER_PAGE), 1),
);

const pagedTransactions = computed(() => {
  const start = (txPage.value - 1) * TX_PER_PAGE;
  return transactions.value.slice(start, start + TX_PER_PAGE);
});

const txRangeText = computed(() => {
  const total = transactions.value.length;
  if (total === 0) return "0 data";

  const from = (txPage.value - 1) * TX_PER_PAGE + 1;
  const to = Math.min(txPage.value * TX_PER_PAGE, total);
  return `${from}–${to} dari ${total} transaksi`;
});

const goToTxPage = (page: number) => {
  txPage.value = Math.min(Math.max(page, 1), totalTxPages.value);
};

watch(totalTxPages, (total) => {
  if (txPage.value > total) txPage.value = total;
});

/* ------------------------------------------------------------------ */
/* Load data                                                           */
/* ------------------------------------------------------------------ */

const loadAdminData = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const [statsRes, usersRes, txRes] = await Promise.all([
      getAdminStats(),
      getAdminUsers(),
      getAdminTransactions(),
    ]);

    stats.value = statsRes;
    users.value = usersRes;
    transactions.value = txRes;
  } catch (error) {
    errorMessage.value = errorText(error, "Gagal mengambil data admin.");
  } finally {
    loading.value = false;
  }
};

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

const openCreateModal = () => {
  modalMode.value = "create";
  currentTransactionId.value = null;
  formData.value = emptyForm(users.value[0]?.id ?? "");
  modalError.value = "";
  isModalOpen.value = true;
};

const openEditModal = (tx: Transaction) => {
  modalMode.value = "edit";
  currentTransactionId.value = tx.id;
  formData.value = {
    user_id: tx.user_id,
    type: tx.type,
    description: tx.description,
    category: tx.category,
    amount: Number(tx.amount),
    transaction_date: String(tx.transaction_date).slice(0, 10),
  };
  modalError.value = "";
  isModalOpen.value = true;
};

const closeModal = () => {
  if (saving.value) return;
  isModalOpen.value = false;
};

const saveTransaction = async () => {
  saving.value = true;
  modalError.value = "";

  try {
    if (modalMode.value === "create") {
      await adminCreateTransaction(
        formData.value.user_id,
        formData.value.type,
        formData.value,
      );
    } else if (currentTransactionId.value !== null) {
      await adminUpdateTransaction(currentTransactionId.value, formData.value);
    }

    isModalOpen.value = false;
    await loadAdminData();
  } catch (error) {
    modalError.value = errorText(error, "Gagal menyimpan transaksi.");
  } finally {
    saving.value = false;
  }
};

const handleDelete = async (id: number) => {
  if (!confirm("Yakin ingin menghapus transaksi ini?")) return;

  try {
    await adminDeleteTransaction(id);
    await loadAdminData();
  } catch (error) {
    errorMessage.value = errorText(error, "Gagal menghapus transaksi.");
  }
};

onMounted(() => {
  void loadAdminData();
});
</script>

<template>
  <DashboardLayout
    title="Admin Dashboard"
    subtitle="Monitoring dan pengelolaan sistem"
  >
    <div class="relative min-h-full">
      <!-- Background blobs -->
      <Teleport to="body">
        <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div
            class="absolute -top-40 -left-40 h-[500px] w-[500px] transform-gpu rounded-full bg-indigo-300/30 blur-[120px]"
          ></div>
          <div
            class="absolute -right-40 top-1/4 h-[450px] w-[450px] transform-gpu rounded-full bg-purple-300/25 blur-[120px]"
          ></div>
          <div
            class="absolute -bottom-32 left-1/3 h-[450px] w-[450px] transform-gpu rounded-full bg-blue-200/30 blur-[120px]"
          ></div>
        </div>
      </Teleport>

      <!-- Toolbar: badge + aksi (judul sudah ada di layout) -->
      <div
        class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-3">
          <span
            class="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-white/90 px-3 py-1.5 text-xs font-medium text-indigo-600 shadow-sm"
          >
            <ShieldCheck :size="14" />
            Administrator
          </span>
          <p class="hidden text-sm text-slate-500 md:block">
            Kelola pengguna dan pantau aktivitas aplikasi.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            :disabled="loading"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            @click="loadAdminData"
          >
            <RefreshCw :size="16" :class="loading ? 'animate-spin' : ''" />
            Refresh
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            @click="openCreateModal"
          >
            <Plus :size="16" />
            Tambah Transaksi
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div
        class="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-1 shadow-sm backdrop-blur"
        role="tablist"
      >
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.key"
          class="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition"
          :class="
            activeTab === tab.key
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          "
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span
            v-if="tab.count !== undefined"
            class="rounded-full px-2 py-0.5 text-[11px] leading-none"
            :class="
              activeTab === tab.key
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-500'
            "
          >
            {{ tab.count }}
          </span>
        </button>
      </div>

      <!-- Error -->
      <div
        v-if="errorMessage"
        class="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        role="alert"
      >
        <p>{{ errorMessage }}</p>
        <button
          type="button"
          class="shrink-0 text-red-400 transition hover:text-red-600"
          aria-label="Tutup pesan error"
          @click="errorMessage = ''"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- TAB: RINGKASAN -->
      <template v-if="activeTab === 'overview'">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <template v-if="loading">
            <div
              v-for="i in 4"
              :key="'skeleton-stat-' + i"
              class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm"
            >
              <div
                class="h-11 w-11 animate-pulse rounded-xl bg-slate-200"
              ></div>
              <div
                class="mt-5 h-4 w-24 animate-pulse rounded bg-slate-200"
              ></div>
              <div
                class="mt-2 h-7 w-16 animate-pulse rounded bg-slate-200"
              ></div>
            </div>
          </template>

          <template v-else>
            <div
              v-for="card in statCards"
              :key="card.key"
              class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl"
                :class="card.iconCls"
              >
                <component :is="card.icon" :size="21" />
              </div>
              <p class="mt-5 text-sm text-slate-500">{{ card.label }}</p>
              <p class="mt-1 text-2xl font-bold" :class="card.valueCls">
                {{ card.value }}
              </p>
              <p class="mt-2 text-xs text-slate-400">{{ card.hint }}</p>
            </div>
          </template>
        </div>
      </template>

      <!-- TAB: PENGGUNA -->
      <section
        v-else-if="activeTab === 'users'"
        class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur"
      >
        <header class="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 class="font-semibold text-slate-900">Daftar pengguna</h2>
          <p class="text-sm text-slate-500">Akun yang terdaftar di aplikasi</p>
        </header>

        <div v-if="loading" class="animate-pulse space-y-3 p-6">
          <div
            v-for="i in 3"
            :key="'skeleton-user-' + i"
            class="h-12 rounded-xl bg-slate-100"
          ></div>
        </div>

        <div
          v-else-if="users.length === 0"
          class="p-10 text-center text-sm text-slate-500"
        >
          Belum ada pengguna.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[560px] text-left text-sm text-slate-600">
            <thead
              class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"
            >
              <tr>
                <th class="px-5 py-3 font-semibold sm:px-6">Pengguna</th>
                <th class="px-5 py-3 font-semibold">Role</th>
                <th class="px-5 py-3 font-semibold">Terdaftar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="u in users"
                :key="u.id"
                class="transition hover:bg-slate-50/70"
              >
                <td class="px-5 py-3 sm:px-6">
                  <p class="font-medium text-slate-900">
                    {{ u.email ?? shortId(u.id) }}
                  </p>
                  <p v-if="u.email" class="font-mono text-xs text-slate-400">
                    {{ shortId(u.id) }}
                  </p>
                </td>
                <td class="px-5 py-3">
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="
                      u.role === 'admin'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-emerald-50 text-emerald-600'
                    "
                  >
                    {{ u.role === "admin" ? "Admin" : "User" }}
                  </span>
                </td>
                <td class="px-5 py-3">{{ formatDateTime(u.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- TAB: TRANSAKSI -->
      <section
        v-else
        class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur"
      >
        <header class="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 class="font-semibold text-slate-900">Kelola seluruh transaksi</h2>
          <p class="text-sm text-slate-500">
            Admin dapat melihat, mengedit, atau menghapus transaksi user
          </p>
        </header>

        <div v-if="loading" class="animate-pulse space-y-3 p-6">
          <div
            v-for="i in 4"
            :key="'skeleton-tx-' + i"
            class="h-12 rounded-xl bg-slate-100"
          ></div>
        </div>

        <div
          v-else-if="transactions.length === 0"
          class="p-10 text-center text-sm text-slate-500"
        >
          Belum ada transaksi.
        </div>

        <template v-else>
          <div class="overflow-x-auto">
            <table
              class="w-full min-w-[760px] text-left text-sm text-slate-600"
            >
              <thead
                class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"
              >
                <tr>
                  <th class="px-5 py-3 font-semibold sm:px-6">Tanggal</th>
                  <th class="px-5 py-3 font-semibold">Keterangan</th>
                  <th class="px-5 py-3 font-semibold">Kategori</th>
                  <th class="px-5 py-3 font-semibold">Tipe</th>
                  <th class="px-5 py-3 text-right font-semibold">Jumlah</th>
                  <th class="px-5 py-3 text-right font-semibold sm:px-6">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="t in pagedTransactions"
                  :key="t.id"
                  class="transition hover:bg-slate-50/70"
                >
                  <td class="whitespace-nowrap px-5 py-3 sm:px-6">
                    {{ formatDate(t.transaction_date) }}
                  </td>
                  <td class="px-5 py-3 font-medium text-slate-900">
                    {{ t.description }}
                  </td>
                  <td class="px-5 py-3 capitalize">{{ t.category }}</td>
                  <td class="px-5 py-3">
                    <span
                      class="rounded-full px-2.5 py-1 text-xs font-semibold"
                      :class="
                        t.type === 'income'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-600'
                      "
                    >
                      {{ t.type === "income" ? "Masuk" : "Keluar" }}
                    </span>
                  </td>
                  <td
                    class="whitespace-nowrap px-5 py-3 text-right font-bold"
                    :class="
                      t.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                    "
                  >
                    {{ t.type === "income" ? "+" : "-" }}
                    {{ formatRupiah(Number(t.amount)) }}
                  </td>
                  <td class="px-5 py-3 sm:px-6">
                    <div class="flex justify-end gap-2">
                      <button
                        type="button"
                        class="rounded-xl bg-indigo-50 p-2 text-indigo-600 transition hover:bg-indigo-100"
                        title="Edit transaksi"
                        aria-label="Edit transaksi"
                        @click="openEditModal(t)"
                      >
                        <Pencil :size="16" />
                      </button>
                      <button
                        type="button"
                        class="rounded-xl bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                        title="Hapus transaksi"
                        aria-label="Hapus transaksi"
                        @click="handleDelete(t.id)"
                      >
                        <Trash2 :size="16" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <nav
            v-if="transactions.length > TX_PER_PAGE"
            class="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 sm:px-6"
            aria-label="Pagination transaksi"
          >
            <p class="text-xs text-slate-500">{{ txRangeText }}</p>

            <div class="flex items-center gap-2">
              <button
                type="button"
                :disabled="txPage === 1"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Halaman sebelumnya"
                @click="goToTxPage(txPage - 1)"
              >
                <ChevronLeft :size="16" />
              </button>

              <span class="px-1 text-sm text-slate-600">
                {{ txPage }} / {{ totalTxPages }}
              </span>

              <button
                type="button"
                :disabled="txPage === totalTxPages"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Halaman berikutnya"
                @click="goToTxPage(txPage + 1)"
              >
                <ChevronRight :size="16" />
              </button>
            </div>
          </nav>
        </template>
      </section>
    </div>

    <!-- MODAL TAMBAH / EDIT TRANSAKSI -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div
        class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="flex items-center justify-between border-b border-slate-100 pb-4"
        >
          <h3 class="text-lg font-bold text-slate-900">
            {{ modalMode === "create" ? "Tambah transaksi" : "Edit transaksi" }}
          </h3>
          <button
            type="button"
            class="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100"
            aria-label="Tutup"
            @click="closeModal"
          >
            <X :size="20" />
          </button>
        </div>

        <form class="mt-4 space-y-4" @submit.prevent="saveTransaction">
          <div
            v-if="modalError"
            class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {{ modalError }}
          </div>

          <div v-if="modalMode === 'create'">
            <label class="block text-xs font-semibold uppercase text-slate-700">
              Pemilik akun
            </label>
            <select v-model="formData.user_id" :class="inputCls" required>
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.email ?? shortId(u.id) }} ({{ u.role }})
              </option>
            </select>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                class="block text-xs font-semibold uppercase text-slate-700"
              >
                Tipe
              </label>
              <select v-model="formData.type" :class="inputCls">
                <option value="income">Uang masuk</option>
                <option value="expense">Uang keluar</option>
              </select>
            </div>

            <div>
              <label
                class="block text-xs font-semibold uppercase text-slate-700"
              >
                Tanggal
              </label>
              <input
                v-model="formData.transaction_date"
                type="date"
                :class="inputCls"
                required
              />
            </div>

            <div>
              <label
                class="block text-xs font-semibold uppercase text-slate-700"
              >
                Jumlah (Rp)
              </label>
              <input
                v-model.number="formData.amount"
                type="number"
                min="1"
                :class="inputCls"
                required
              />
            </div>

            <div>
              <label
                class="block text-xs font-semibold uppercase text-slate-700"
              >
                Kategori
              </label>
              <input
                v-model="formData.category"
                type="text"
                placeholder="Gaji, Makanan, Transport"
                :class="inputCls"
                required
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase text-slate-700">
              Keterangan
            </label>
            <input
              v-model="formData.description"
              type="text"
              placeholder="Detail transaksi..."
              :class="inputCls"
              required
            />
          </div>

          <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              :disabled="saving"
              class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              @click="closeModal"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ saving ? "Menyimpan..." : "Simpan" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </DashboardLayout>
</template>
