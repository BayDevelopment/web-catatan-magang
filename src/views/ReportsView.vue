<script setup lang="ts">
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ReceiptText,
  RefreshCw,
  Search,
} from "lucide-vue-next";

import { computed, onMounted, ref, watch } from "vue";
import DashboardLayout from "../layouts/DashboardLayout.vue";
import { getTransactions } from "../services/transaction.service";
import type { Transaction } from "../types/transaction";

/* ------------------------------------------------------------------ */
/* Konfigurasi                                                         */
/* ------------------------------------------------------------------ */
const PAYDAY = 22; // tanggal gajian
const PER_PAGE = 10; // transaksi per halaman
const MS_DAY = 1000 * 60 * 60 * 24;

type Mode = "gajian" | "month" | "day" | "range";
type TypeFilter = "all" | "income" | "expense";

const modes: { value: Mode; label: string }[] = [
  { value: "gajian", label: "Periode gajian" },
  { value: "month", label: "Bulanan" },
  { value: "day", label: "Harian" },
  { value: "range", label: "Rentang tanggal" },
];

const typeOptions: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "income", label: "Masuk" },
  { value: "expense", label: "Keluar" },
];

/* ------------------------------------------------------------------ */
/* Helper format                                                       */
/* ------------------------------------------------------------------ */
const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatCompact = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

const formatShortDate = (date: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));

const formatMonthShort = (month: string) =>
  new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "2-digit",
  }).format(new Date(`${month}-01T00:00:00`));

const formatMonthLong = (month: string) =>
  new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00:00`));

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */
const transactions = ref<Transaction[]>([]);
const loading = ref(true);
const errorMessage = ref("");

const todayISO = toISO(new Date());
const mode = ref<Mode>("gajian");
const selectedMonth = ref(todayISO.slice(0, 7));
const selectedDay = ref(todayISO);
const rangeFrom = ref(`${todayISO.slice(0, 7)}-01`);
const rangeTo = ref(todayISO);

const typeFilter = ref<TypeFilter>("all");
const search = ref("");
const currentPage = ref(1);
const hoverIndex = ref<number | null>(null);

/* ------------------------------------------------------------------ */
/* Pilihan periode gajian (6 siklus terakhir)                          */
/* ------------------------------------------------------------------ */
interface CycleOption {
  value: string;
  from: string;
  to: string;
  label: string;
}

const cycleOptions: CycleOption[] = (() => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const offset = now.getDate() >= PAYDAY ? 0 : -1;
  const options: CycleOption[] = [];

  for (let i = 0; i < 6; i++) {
    const start = new Date(
      now.getFullYear(),
      now.getMonth() + offset - i,
      PAYDAY,
    );
    const next = new Date(start.getFullYear(), start.getMonth() + 1, PAYDAY);
    const end = new Date(next);
    end.setDate(end.getDate() - 1);

    const from = toISO(start);
    const to = toISO(end);
    options.push({
      value: from,
      from,
      to,
      label: `${formatDate(from)} – ${formatDate(to)}`,
    });
  }
  return options;
})();

const selectedCycle = ref(cycleOptions[0]!.value);

/* ------------------------------------------------------------------ */
/* Load data                                                           */
/* ------------------------------------------------------------------ */
const loadTransactions = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    transactions.value = await getTransactions();
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data laporan transaksi.";
  } finally {
    loading.value = false;
  }
};

/* ------------------------------------------------------------------ */
/* Rentang tanggal terpilih                                            */
/* ------------------------------------------------------------------ */
const range = computed(() => {
  switch (mode.value) {
    case "gajian": {
      const c =
        cycleOptions.find((o) => o.value === selectedCycle.value) ??
        cycleOptions[0]!;
      return { from: c.from, to: c.to };
    }
    case "month": {
      const [y, m] = selectedMonth.value.split("-").map(Number);
      if (!y || !m) return { from: "", to: "" };
      const last = new Date(y, m, 0).getDate();
      return {
        from: `${selectedMonth.value}-01`,
        to: `${selectedMonth.value}-${String(last).padStart(2, "0")}`,
      };
    }
    case "day":
      return { from: selectedDay.value, to: selectedDay.value };
    default:
      return { from: rangeFrom.value, to: rangeTo.value };
  }
});

const rangeInvalid = computed(
  () =>
    !range.value.from || !range.value.to || range.value.from > range.value.to,
);

const rangeLabel = computed(() => {
  if (rangeInvalid.value) return "";
  const { from, to } = range.value;
  return from === to
    ? formatDate(from)
    : `${formatDate(from)} – ${formatDate(to)}`;
});

const spanDays = computed(() => {
  if (rangeInvalid.value) return 0;
  const a = new Date(`${range.value.from}T00:00:00`).getTime();
  const b = new Date(`${range.value.to}T00:00:00`).getTime();
  return Math.round((b - a) / MS_DAY) + 1;
});

/** Rentang panjang (> 62 hari) dikelompokkan per bulan di chart */
const groupByMonth = computed(() => spanDays.value > 62);

/* ------------------------------------------------------------------ */
/* Data terfilter                                                      */
/* ------------------------------------------------------------------ */
/** Transaksi dalam rentang tanggal (dasar untuk kartu & chart) */
const rangeTransactions = computed(() => {
  if (rangeInvalid.value) return [];
  const { from, to } = range.value;
  return transactions.value.filter(
    (t) => t.transaction_date >= from && t.transaction_date <= to,
  );
});

const totalIncome = computed(() =>
  rangeTransactions.value
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0),
);

const totalExpense = computed(() =>
  rangeTransactions.value
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0),
);

const balance = computed(() => totalIncome.value - totalExpense.value);

/** Transaksi untuk tabel: rentang + jenis + pencarian */
const tableRows = computed(() => {
  const q = search.value.trim().toLowerCase();

  return rangeTransactions.value
    .filter((t) => typeFilter.value === "all" || t.type === typeFilter.value)
    .filter(
      (t) =>
        !q ||
        String(t.description ?? "")
          .toLowerCase()
          .includes(q) ||
        String(t.category ?? "")
          .toLowerCase()
          .includes(q),
    )
    .sort((a, b) => {
      if (a.transaction_date !== b.transaction_date) {
        return a.transaction_date < b.transaction_date ? 1 : -1;
      }
      return String(b.created_at).localeCompare(String(a.created_at));
    });
});

/* ------------------------------------------------------------------ */
/* Chart                                                               */
/* ------------------------------------------------------------------ */
interface Bucket {
  key: string;
  label: string;
  fullLabel: string;
  income: number;
  expense: number;
  cumulative: number;
}

const buckets = computed<Bucket[]>(() => {
  if (rangeInvalid.value) return [];

  const map = new Map<string, { income: number; expense: number }>();
  for (const t of rangeTransactions.value) {
    const key = groupByMonth.value
      ? t.transaction_date.slice(0, 7)
      : t.transaction_date;
    const cur = map.get(key) ?? { income: 0, expense: 0 };
    if (t.type === "income") cur.income += Number(t.amount);
    else cur.expense += Number(t.amount);
    map.set(key, cur);
  }

  const keys: string[] = [];
  const start = new Date(`${range.value.from}T00:00:00`);
  const end = new Date(`${range.value.to}T00:00:00`);

  if (groupByMonth.value) {
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      keys.push(toISO(cur).slice(0, 7));
      cur.setMonth(cur.getMonth() + 1);
    }
  } else {
    const cur = new Date(start);
    while (cur <= end) {
      keys.push(toISO(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }

  let cumulative = 0;
  return keys.map((key) => {
    const v = map.get(key) ?? { income: 0, expense: 0 };
    cumulative += v.income - v.expense;
    return {
      key,
      label: groupByMonth.value ? formatMonthShort(key) : formatShortDate(key),
      fullLabel: groupByMonth.value ? formatMonthLong(key) : formatDate(key),
      income: v.income,
      expense: v.expense,
      cumulative,
    };
  });
});

const W = 760;
const H = 300;
const PAD = { top: 16, right: 16, bottom: 32, left: 56 };
const innerW = W - PAD.left - PAD.right;
const innerH = H - PAD.top - PAD.bottom;

const niceStep = (max: number) => {
  const raw = Math.max(max, 1) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * pow;
};

const yScale = computed(() => {
  const values = buckets.value.flatMap((b) => [
    b.income,
    b.expense,
    b.cumulative,
  ]);
  const rawMax = Math.max(...values, 1);
  const rawMin = Math.min(...values, 0);
  const step = niceStep(rawMax - rawMin);

  const max = Math.ceil(rawMax / step) * step;
  const min = Math.floor(rawMin / step) * step;

  const ticks: number[] = [];
  for (let v = min; v <= max + 1; v += step) ticks.push(v);
  return { min, max, ticks };
});

const yPos = (value: number) => {
  const { min, max } = yScale.value;
  return PAD.top + innerH - ((value - min) / (max - min)) * innerH;
};

const band = computed(() => innerW / Math.max(buckets.value.length, 1));
const xCenter = (i: number) => PAD.left + band.value * (i + 0.5);
const barWidth = computed(() => Math.max(Math.min(band.value * 0.35, 16), 2));

const cumulativeLine = computed(() =>
  buckets.value.map((b, i) => `${xCenter(i)},${yPos(b.cumulative)}`).join(" "),
);

const xLabels = computed(() => {
  const n = buckets.value.length;
  const step = Math.max(Math.ceil(n / 8), 1);
  return buckets.value
    .map((b, i) => ({ i, label: b.label, key: b.key }))
    .filter(({ i }) => i % step === 0);
});

const hovered = computed(() =>
  hoverIndex.value === null ? null : (buckets.value[hoverIndex.value] ?? null),
);

const tooltipStyle = computed(() => {
  if (hoverIndex.value === null) return {};
  const leftPct = (xCenter(hoverIndex.value) / W) * 100;
  const flip = leftPct > 62;
  return {
    left: `${leftPct}%`,
    transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
  };
});

const hasChartData = computed(
  () => totalIncome.value > 0 || totalExpense.value > 0,
);

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */
const totalPages = computed(() =>
  Math.max(Math.ceil(tableRows.value.length / PER_PAGE), 1),
);

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * PER_PAGE;
  return tableRows.value.slice(start, start + PER_PAGE);
});

const rangeText = computed(() => {
  const total = tableRows.value.length;
  if (total === 0) return "0 transaksi";
  const from = (currentPage.value - 1) * PER_PAGE + 1;
  const to = Math.min(currentPage.value * PER_PAGE, total);
  return `${from}–${to} dari ${total} transaksi`;
});

const pageNumbers = computed<(number | "...")[]>(() => {
  const total = totalPages.value;
  const cur = currentPage.value;

  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];
  if (cur > 3) pages.push("...");
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) {
    pages.push(p);
  }
  if (cur < total - 2) pages.push("...");
  pages.push(total);
  return pages;
});

const goToPage = (page: number) => {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value);
};

// Balik ke halaman 1 setiap filter berubah
watch(
  () => [range.value.from, range.value.to, typeFilter.value, search.value],
  () => {
    currentPage.value = 1;
    hoverIndex.value = null;
  },
);

watch(totalPages, (total) => {
  if (currentPage.value > total) currentPage.value = total;
});

/* ------------------------------------------------------------------ */
/* Export CSV                                                          */
/* ------------------------------------------------------------------ */
const exportCsv = () => {
  const header = ["Tanggal", "Keterangan", "Kategori", "Jenis", "Nominal"];
  const rows = tableRows.value.map((t) => [
    t.transaction_date,
    String(t.description ?? ""),
    String(t.category ?? ""),
    t.type === "income" ? "Masuk" : "Keluar",
    String(t.type === "income" ? Number(t.amount) : -Number(t.amount)),
  ]);

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv =
    "\uFEFF" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `laporan_${range.value.from}_${range.value.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

onMounted(() => {
  void loadTransactions();
});
</script>

<template>
  <!-- Background blobs -->
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        class="absolute -left-40 -top-40 h-[500px] w-[500px] transform-gpu rounded-full bg-indigo-300/30 blur-[120px]"
      ></div>
      <div
        class="absolute -right-40 top-1/4 h-[450px] w-[450px] transform-gpu rounded-full bg-purple-300/25 blur-[120px]"
      ></div>
      <div
        class="absolute -bottom-32 left-1/3 h-[450px] w-[450px] transform-gpu rounded-full bg-blue-200/30 blur-[120px]"
      ></div>
      <div
        class="absolute bottom-10 right-10 h-80 w-80 transform-gpu rounded-full bg-sky-200/20 blur-[100px]"
      ></div>
    </div>
  </Teleport>

  <DashboardLayout title="Laporan" subtitle="Lihat ringkasan keuangan kamu">
    <div class="relative z-10">
      <!-- Header -->
      <div
        class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1
            class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            Laporan keuangan
          </h1>
          <p class="mt-1 text-sm text-slate-500">
            <template v-if="rangeLabel">{{ rangeLabel }}</template>
            <template v-else>Pilih rentang tanggal yang valid.</template>
          </p>
        </div>

        <div class="flex gap-2 self-start sm:self-auto">
          <button
            type="button"
            :disabled="loading || tableRows.length === 0"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            @click="exportCsv"
          >
            <Download :size="16" />
            Unduh CSV
          </button>

          <button
            type="button"
            :disabled="loading"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            @click="loadTransactions"
          >
            <RefreshCw :size="16" :class="loading ? 'animate-spin' : ''" />
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

      <!-- Filter periode -->
      <div
        class="mb-6 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-xl"
      >
        <!-- Mode -->
        <div
          class="inline-flex w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1 sm:w-auto"
          role="tablist"
          aria-label="Jenis periode"
        >
          <button
            v-for="m in modes"
            :key="m.value"
            type="button"
            role="tab"
            :aria-selected="mode === m.value"
            class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none"
            :class="
              mode === m.value
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            "
            @click="mode = m.value"
          >
            {{ m.label }}
          </button>
        </div>

        <!-- Input sesuai mode -->
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-if="mode === 'gajian'" class="sm:col-span-2">
            <label
              for="f-cycle"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Siklus gajian (tanggal {{ PAYDAY }})
            </label>
            <select
              id="f-cycle"
              v-model="selectedCycle"
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option v-for="o in cycleOptions" :key="o.value" :value="o.value">
                {{ o.label }}
              </option>
            </select>
          </div>

          <div v-else-if="mode === 'month'">
            <label
              for="f-month"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Bulan
            </label>
            <input
              id="f-month"
              v-model="selectedMonth"
              type="month"
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div v-else-if="mode === 'day'">
            <label
              for="f-day"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Tanggal
            </label>
            <input
              id="f-day"
              v-model="selectedDay"
              type="date"
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <template v-else>
            <div>
              <label
                for="f-from"
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Dari tanggal
              </label>
              <input
                id="f-from"
                v-model="rangeFrom"
                type="date"
                :max="rangeTo || undefined"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label
                for="f-to"
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Sampai tanggal
              </label>
              <input
                id="f-to"
                v-model="rangeTo"
                type="date"
                :min="rangeFrom || undefined"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </template>
        </div>

        <p v-if="rangeInvalid" class="mt-3 text-sm font-medium text-red-600">
          Tanggal awal harus sebelum atau sama dengan tanggal akhir.
        </p>
      </div>

      <!-- Summary Cards -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <template v-if="loading">
          <div
            v-for="i in 4"
            :key="'sk-card-' + i"
            class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm"
          >
            <div class="h-10 w-10 animate-pulse rounded-xl bg-slate-200"></div>
            <div class="mt-4 h-7 w-32 animate-pulse rounded bg-slate-200"></div>
          </div>
        </template>

        <template v-else>
          <div
            class="rounded-2xl border border-emerald-100/80 bg-emerald-50/90 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"
              >
                <ArrowDownToLine :size="19" />
              </div>
              <span class="text-sm font-medium text-emerald-700"
                >Pemasukan</span
              >
            </div>
            <p class="mt-4 break-words text-2xl font-bold text-emerald-700">
              {{ formatRupiah(totalIncome) }}
            </p>
          </div>

          <div
            class="rounded-2xl border border-red-100/80 bg-red-50/90 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600"
              >
                <ArrowUpFromLine :size="19" />
              </div>
              <span class="text-sm font-medium text-red-700">Pengeluaran</span>
            </div>
            <p class="mt-4 break-words text-2xl font-bold text-red-700">
              {{ formatRupiah(totalExpense) }}
            </p>
          </div>

          <div
            class="rounded-2xl border border-indigo-100/80 bg-indigo-50/90 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"
              >
                <FileText :size="19" />
              </div>
              <span class="text-sm font-medium text-indigo-700">Selisih</span>
            </div>
            <p
              class="mt-4 break-words text-2xl font-bold"
              :class="balance >= 0 ? 'text-indigo-700' : 'text-red-700'"
            >
              {{ formatRupiah(balance) }}
            </p>
          </div>

          <div
            class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
              >
                <ReceiptText :size="19" />
              </div>
              <span class="text-sm font-medium text-slate-600"
                >Jumlah transaksi</span
              >
            </div>
            <p class="mt-4 text-2xl font-bold text-slate-900">
              {{ rangeTransactions.length }}
            </p>
          </div>
        </template>
      </div>

      <!-- Chart -->
      <div
        class="mt-6 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-xl sm:p-6"
      >
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <h2 class="font-semibold text-slate-900">
              Grafik pemasukan dan pengeluaran
            </h2>
            <p class="text-sm text-slate-500">
              {{ groupByMonth ? "Dikelompokkan per bulan" : "Per hari" }}
              dengan selisih kumulatif
            </p>
          </div>

          <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            <li class="flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-sm bg-emerald-400"></span>
              Masuk
            </li>
            <li class="flex items-center gap-1.5">
              <span class="h-2.5 w-2.5 rounded-sm bg-red-400"></span>
              Keluar
            </li>
            <li class="flex items-center gap-1.5">
              <span class="h-0.5 w-4 rounded bg-indigo-600"></span>
              Selisih kumulatif
            </li>
          </ul>
        </div>

        <div class="mt-6">
          <div
            v-if="loading"
            class="h-64 animate-pulse rounded-xl bg-slate-100"
          ></div>

          <div
            v-else-if="rangeInvalid"
            class="flex h-40 items-center justify-center text-sm text-slate-400"
          >
            Pilih rentang tanggal yang valid untuk melihat grafik.
          </div>

          <div v-else class="relative">
            <svg
              :viewBox="`0 0 ${W} ${H}`"
              class="h-auto w-full select-none"
              role="img"
              aria-label="Grafik pemasukan, pengeluaran, dan selisih kumulatif pada periode terpilih"
              @mouseleave="hoverIndex = null"
            >
              <!-- Grid + sumbu Y -->
              <template v-for="tick in yScale.ticks" :key="'tick-' + tick">
                <line
                  :x1="PAD.left"
                  :x2="W - PAD.right"
                  :y1="yPos(tick)"
                  :y2="yPos(tick)"
                  :stroke="tick === 0 ? '#94a3b8' : '#e2e8f0'"
                  :stroke-dasharray="tick === 0 ? '0' : '3 4'"
                  stroke-width="1"
                />
                <text
                  :x="PAD.left - 8"
                  :y="yPos(tick) + 4"
                  text-anchor="end"
                  class="fill-slate-400"
                  font-size="11"
                >
                  {{ formatCompact(tick) }}
                </text>
              </template>

              <!-- Highlight hover -->
              <rect
                v-if="hoverIndex !== null"
                :x="PAD.left + band * hoverIndex"
                :y="PAD.top"
                :width="band"
                :height="innerH"
                fill="#6366f1"
                fill-opacity="0.07"
              />

              <!-- Bar masuk & keluar -->
              <g v-for="(b, i) in buckets" :key="'bar-' + b.key">
                <rect
                  v-if="b.income > 0"
                  :x="xCenter(i) - barWidth - 1"
                  :y="yPos(b.income)"
                  :width="barWidth"
                  :height="Math.max(yPos(0) - yPos(b.income), 0)"
                  rx="2"
                  fill="#34d399"
                />
                <rect
                  v-if="b.expense > 0"
                  :x="xCenter(i) + 1"
                  :y="yPos(b.expense)"
                  :width="barWidth"
                  :height="Math.max(yPos(0) - yPos(b.expense), 0)"
                  rx="2"
                  fill="#f87171"
                />
              </g>

              <!-- Garis selisih kumulatif -->
              <polyline
                v-if="buckets.length > 1"
                :points="cumulativeLine"
                fill="none"
                stroke="#4f46e5"
                stroke-width="2.5"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
              <template v-if="buckets.length <= 31">
                <circle
                  v-for="(b, i) in buckets"
                  :key="'dot-' + b.key"
                  :cx="xCenter(i)"
                  :cy="yPos(b.cumulative)"
                  r="3"
                  fill="#fff"
                  stroke="#4f46e5"
                  stroke-width="2"
                />
              </template>

              <!-- Sumbu X -->
              <text
                v-for="l in xLabels"
                :key="'x-' + l.key"
                :x="xCenter(l.i)"
                :y="H - 10"
                text-anchor="middle"
                class="fill-slate-400"
                font-size="11"
              >
                {{ l.label }}
              </text>

              <!-- Area interaksi -->
              <rect
                v-for="(b, i) in buckets"
                :key="'hit-' + b.key"
                :x="PAD.left + band * i"
                :y="PAD.top"
                :width="band"
                :height="innerH"
                fill="transparent"
                @mouseenter="hoverIndex = i"
                @touchstart.passive="hoverIndex = i"
              />
            </svg>

            <!-- Tooltip -->
            <div
              v-if="hovered"
              class="pointer-events-none absolute top-2 z-10 w-52 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl"
              :style="tooltipStyle"
            >
              <p class="font-semibold text-slate-900">
                {{ hovered.fullLabel }}
              </p>
              <dl class="mt-2 space-y-1">
                <div class="flex justify-between gap-3">
                  <dt class="text-slate-500">Masuk</dt>
                  <dd class="font-medium text-emerald-600">
                    {{ formatRupiah(hovered.income) }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-slate-500">Keluar</dt>
                  <dd class="font-medium text-red-600">
                    {{ formatRupiah(hovered.expense) }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-slate-500">Selisih kumulatif</dt>
                  <dd class="font-semibold text-indigo-600">
                    {{ formatRupiah(hovered.cumulative) }}
                  </dd>
                </div>
              </dl>
            </div>

            <p
              v-if="!hasChartData"
              class="mt-2 text-center text-xs text-slate-400"
            >
              Belum ada transaksi pada periode ini.
            </p>
          </div>
        </div>
      </div>

      <!-- Tabel -->
      <div
        class="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl"
      >
        <div
          class="flex flex-col gap-4 border-b border-slate-200/80 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <h2 class="font-semibold text-slate-900">Detail transaksi</h2>
            <p class="mt-1 text-sm text-slate-500">
              Semua transaksi pada periode yang dipilih.
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <!-- Filter jenis -->
            <div
              class="inline-flex rounded-xl bg-slate-100 p-1"
              role="group"
              aria-label="Filter jenis transaksi"
            >
              <button
                v-for="o in typeOptions"
                :key="o.value"
                type="button"
                class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
                :class="
                  typeFilter === o.value
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                "
                :aria-pressed="typeFilter === o.value"
                @click="typeFilter = o.value"
              >
                {{ o.label }}
              </button>
            </div>

            <!-- Search -->
            <div class="relative">
              <Search
                :size="16"
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                v-model="search"
                type="search"
                placeholder="Cari keterangan atau kategori"
                aria-label="Cari transaksi"
                class="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-64"
              />
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[700px]">
            <thead class="bg-slate-50/80">
              <tr>
                <th
                  class="px-6 py-4 text-left text-xs font-semibold text-slate-500"
                >
                  Tanggal
                </th>
                <th
                  class="px-6 py-4 text-left text-xs font-semibold text-slate-500"
                >
                  Keterangan
                </th>
                <th
                  class="px-6 py-4 text-left text-xs font-semibold text-slate-500"
                >
                  Kategori
                </th>
                <th
                  class="px-6 py-4 text-left text-xs font-semibold text-slate-500"
                >
                  Jenis
                </th>
                <th
                  class="px-6 py-4 text-right text-xs font-semibold text-slate-500"
                >
                  Nominal
                </th>
              </tr>
            </thead>

            <!-- Skeleton -->
            <tbody
              v-if="loading"
              class="animate-pulse divide-y divide-slate-100"
            >
              <tr v-for="i in 3" :key="'skeleton-report-' + i">
                <td class="px-6 py-4">
                  <div class="h-4 w-24 rounded bg-slate-200"></div>
                </td>
                <td class="px-6 py-4">
                  <div class="h-4 w-40 rounded bg-slate-200"></div>
                </td>
                <td class="px-6 py-4">
                  <div class="h-4 w-28 rounded bg-slate-200"></div>
                </td>
                <td class="px-6 py-4">
                  <div class="h-6 w-16 rounded-full bg-slate-200"></div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="ml-auto h-4 w-24 rounded bg-slate-200"></div>
                </td>
              </tr>
            </tbody>

            <!-- Isi -->
            <tbody v-else class="divide-y divide-slate-100">
              <tr
                v-for="transaction in paginatedRows"
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
                    {{ transaction.type === "income" ? "Masuk" : "Keluar" }}
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
                  {{ transaction.type === "income" ? "+" : "-" }}
                  {{ formatRupiah(Number(transaction.amount)) }}
                </td>
              </tr>

              <tr v-if="tableRows.length === 0">
                <td colspan="5" class="px-6 py-14 text-center">
                  <div
                    class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"
                  >
                    <FileText :size="22" />
                  </div>
                  <p class="mt-4 text-sm font-medium text-slate-600">
                    Tidak ada transaksi
                  </p>
                  <p class="mt-1 text-sm text-slate-400">
                    Coba ubah periode, jenis, atau kata kunci pencarian.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <nav
          v-if="!loading && tableRows.length > PER_PAGE"
          class="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          aria-label="Pagination transaksi"
        >
          <p class="text-xs text-slate-500">{{ rangeText }}</p>

          <div class="flex items-center gap-1">
            <button
              type="button"
              :disabled="currentPage === 1"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman sebelumnya"
              @click="goToPage(currentPage - 1)"
            >
              <ChevronLeft :size="16" />
            </button>

            <template v-for="(p, idx) in pageNumbers" :key="'p-' + idx">
              <span v-if="p === '...'" class="px-2 text-sm text-slate-400"
                >…</span
              >
              <button
                v-else
                type="button"
                class="h-9 min-w-9 rounded-lg border px-2 text-sm font-medium transition"
                :class="
                  p === currentPage
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                "
                :aria-current="p === currentPage ? 'page' : undefined"
                @click="goToPage(p)"
              >
                {{ p }}
              </button>
            </template>

            <button
              type="button"
              :disabled="currentPage === totalPages"
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman berikutnya"
              @click="goToPage(currentPage + 1)"
            >
              <ChevronRight :size="16" />
            </button>
          </div>
        </nav>
      </div>
    </div>
  </DashboardLayout>
</template>
