<script setup lang="ts">
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingUp,
  RefreshCw,
} from "lucide-vue-next";
import { computed, onActivated, onMounted, ref, watch } from "vue";

import DashboardLayout from "../layouts/DashboardLayout.vue";
import { getTransactions } from "../services/transaction.service";
import type { Transaction } from "../types/transaction";

/* ------------------------------------------------------------------ */
/* Konfigurasi                                                         */
/* ------------------------------------------------------------------ */

const PAYDAY = 21;
const PER_PAGE = 5;
const MS_DAY = 24 * 60 * 60 * 1000;
const ROUNDING_UNIT = 1000;
const EARLY_PAY_DAYS = 7;

const FIXED_KEYWORDS = [
  "kos",
  "sewa",
  "bensin",
  "cicilan",
  "tagihan",
  "listrik",
  "air",
  "internet",
];

const SALARY_KEYWORDS = ["gaji", "salary", "payroll"];

/**
 * Mendukung flag opsional meskipun interface Transaction
 * belum mempunyai is_salary dan is_fixed.
 */
type TransactionWithFlags = Transaction & {
  is_salary?: boolean | null;
  is_fixed?: boolean | null;
};

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const transactions = ref<TransactionWithFlags[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const currentPage = ref(1);
const hoverIndex = ref<number | null>(null);
const now = ref(new Date());

/* ------------------------------------------------------------------ */
/* Format dan tanggal                                                   */
/* ------------------------------------------------------------------ */

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatCompact = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);

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

const toISO = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const normalizeDate = (value: unknown): string => {
  const text = String(value ?? "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  // Tanggal database tanpa zona waktu dipertahankan
  // agar tidak bergeser ke hari sebelumnya.
  if (/^\d{4}-\d{2}-\d{2}[T ]/.test(text)) {
    return text.slice(0, 10);
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return toISO(parsed);
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const addMonthsOnPayday = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, PAYDAY);

const differenceInDays = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_DAY);

const amountOf = (transaction: TransactionWithFlags) => {
  const amount = Number(transaction.amount);

  return Number.isFinite(amount) ? Math.max(amount, 0) : 0;
};

/* ------------------------------------------------------------------ */
/* Pengenalan transaksi gaji dan biaya tetap                            */
/* ------------------------------------------------------------------ */

const isSalary = (transaction: TransactionWithFlags) => {
  if (transaction.type !== "income") {
    return false;
  }

  if (transaction.is_salary === true) {
    return true;
  }

  if (transaction.is_salary === false) {
    return false;
  }

  const text = `${transaction.category ?? ""} ${transaction.description ?? ""}`
    .toLowerCase()
    .trim();

  return SALARY_KEYWORDS.some((keyword) => text.includes(keyword));
};

const isFixedExpense = (transaction: TransactionWithFlags) => {
  if (transaction.type !== "expense") {
    return false;
  }

  if (transaction.is_fixed === true) {
    return true;
  }

  if (transaction.is_fixed === false) {
    return false;
  }

  const text = `${transaction.category ?? ""} ${transaction.description ?? ""}`
    .toLowerCase()
    .trim();

  return FIXED_KEYWORDS.some((keyword) => text.includes(keyword));
};

/* ------------------------------------------------------------------ */
/* Load transaksi                                                       */
/* ------------------------------------------------------------------ */

const loadTransactions = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const data = await getTransactions();

    transactions.value = data
      .map((transaction) => ({
        ...transaction,
        transaction_date: normalizeDate(transaction.transaction_date),
        amount: amountOf(transaction),
      }))
      .filter((transaction) => transaction.transaction_date !== "");

    now.value = new Date();
    currentPage.value = 1;
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data transaksi.";
  } finally {
    loading.value = false;
  }
};

/* ------------------------------------------------------------------ */
/* Saldo keseluruhan                                                    */
/* ------------------------------------------------------------------ */

const balance = computed(() =>
  transactions.value.reduce(
    (total, transaction) =>
      total +
      (transaction.type === "income"
        ? amountOf(transaction)
        : -amountOf(transaction)),
    0,
  ),
);

/* ------------------------------------------------------------------ */
/* Periode gajian                                                       */
/* ------------------------------------------------------------------ */

const period = computed(() => {
  const today = startOfDay(now.value);
  const todayISO = toISO(today);

  // Periode dimulai setiap tanggal 21.
  const start =
    today.getDate() >= PAYDAY
      ? new Date(today.getFullYear(), today.getMonth(), PAYDAY)
      : new Date(today.getFullYear(), today.getMonth() - 1, PAYDAY);

  // Periode berikutnya dimulai tanggal 21 bulan berikutnya.
  const nextPayday = new Date(
    start.getFullYear(),
    start.getMonth() + 1,
    PAYDAY,
  );

  // Periode berjalan berakhir tanggal 20.
  const end = addDays(nextPayday, -1);

  const salaryTransactions = transactions.value
    .filter(isSalary)
    .filter((transaction) => transaction.transaction_date <= todayISO)
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

  // Hanya tampilkan acuan gaji apabila transaksi gaji
  // tercatat pada awal periode yang sedang berjalan.
  const salaryAtPeriodStart = salaryTransactions.find(
    (transaction) => transaction.transaction_date === toISO(start),
  );

  const totalDays = differenceInDays(start, nextPayday);
  const dayIndex = differenceInDays(start, today);
  const daysLeft = Math.max(differenceInDays(today, nextPayday), 1);

  return {
    startDate: start,
    start: toISO(start),
    end: toISO(end),
    nextPayday: toISO(nextPayday),
    totalDays: Math.max(totalDays, 1),
    dayIndex,
    daysLeft,
    today: todayISO,
    salaryDate: salaryAtPeriodStart?.transaction_date ?? null,
  };
});

const periodLabel = computed(
  () => `${formatDate(period.value.start)} – ${formatDate(period.value.end)}`,
);

/* ------------------------------------------------------------------ */
/* Transaksi pada periode aktif                                         */
/* ------------------------------------------------------------------ */

const periodTransactions = computed(() =>
  transactions.value.filter(
    (transaction) =>
      transaction.transaction_date >= period.value.start &&
      transaction.transaction_date <= period.value.end,
  ),
);

const openingBalance = computed(() =>
  transactions.value
    .filter((transaction) => transaction.transaction_date < period.value.start)
    .reduce(
      (total, transaction) =>
        total +
        (transaction.type === "income"
          ? amountOf(transaction)
          : -amountOf(transaction)),
      0,
    ),
);

const upcomingCount = computed(
  () =>
    transactions.value.filter(
      (transaction) => transaction.transaction_date > period.value.end,
    ).length,
);

const periodIncome = computed(() =>
  periodTransactions.value
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + amountOf(transaction), 0),
);

const periodExpense = computed(() =>
  periodTransactions.value
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + amountOf(transaction), 0),
);

/* ------------------------------------------------------------------ */
/* Perhitungan anggaran                                                 */
/* ------------------------------------------------------------------ */

/**
 * Dana periode terdiri dari saldo sebelumnya dan pemasukan
 * pada periode aktif.
 */
const fundsThisPeriod = computed(
  () => openingBalance.value + periodIncome.value,
);

/** Sisa bersih setelah semua pengeluaran periode aktif. */
const remainingBudget = computed(
  () => fundsThisPeriod.value - periodExpense.value,
);

/** Biaya tetap yang dicatat dalam periode aktif. */
const fixedExpenseTotal = computed(() =>
  periodTransactions.value
    .filter(isFixedExpense)
    .reduce((total, transaction) => total + amountOf(transaction), 0),
);

/** Pengeluaran variabel adalah pengeluaran selain biaya tetap. */
const variableExpenses = computed(() =>
  periodTransactions.value.filter(
    (transaction) =>
      transaction.type === "expense" && !isFixedExpense(transaction),
  ),
);

/** Pengeluaran variabel sebelum hari ini. */
const variableSpentBeforeToday = computed(() =>
  variableExpenses.value
    .filter((transaction) => transaction.transaction_date < period.value.today)
    .reduce((total, transaction) => total + amountOf(transaction), 0),
);

/** Pengeluaran variabel hari ini. */
const spentToday = computed(() =>
  variableExpenses.value
    .filter(
      (transaction) => transaction.transaction_date === period.value.today,
    )
    .reduce((total, transaction) => total + amountOf(transaction), 0),
);

/**
 * Pool untuk perhitungan jatah harian.
 * Pengeluaran hari ini belum dikurangi di sini karena
 * akan dikurangkan pada todayLeft.
 */
const poolForDaily = computed(
  () =>
    fundsThisPeriod.value -
    fixedExpenseTotal.value -
    variableSpentBeforeToday.value,
);

/** Sisa pool setelah pengeluaran variabel hari ini. */
const remainingDailyPool = computed(
  () => poolForDaily.value - spentToday.value,
);

/**
 * Jatah harian dibagi rata berdasarkan sisa hari hingga
 * tanggal gajian berikutnya, termasuk hari ini.
 * Hasil dibulatkan ke bawah ke kelipatan Rp1.000.
 */
const dailyBudget = computed(() => {
  const pool = poolForDaily.value;
  const daysLeft = period.value.daysLeft;

  if (pool <= 0 || daysLeft <= 0) {
    return 0;
  }

  return Math.floor(pool / daysLeft / ROUNDING_UNIT) * ROUNDING_UNIT;
});

/** Sisa atau kelebihan jatah hari ini. */
const todayLeft = computed(() => dailyBudget.value - spentToday.value);

/** Persentase pengeluaran dari dana periode. */
const usedPercent = computed(() => {
  if (fundsThisPeriod.value <= 0) {
    return periodExpense.value > 0 ? 100 : 0;
  }

  return Math.min(
    Math.round((periodExpense.value / fundsThisPeriod.value) * 100),
    100,
  );
});

/** Status kondisi anggaran. */
const status = computed(() => {
  if (remainingBudget.value < 0) {
    return {
      label: "Defisit",
      cls: "bg-red-400/20 text-red-100",
    };
  }

  if (remainingDailyPool.value < 0) {
    return {
      label: "Dana tidak cukup",
      cls: "bg-amber-400/20 text-amber-100",
    };
  }

  if (todayLeft.value < 0) {
    return {
      label: "Jatah harian terlampaui",
      cls: "bg-amber-400/20 text-amber-100",
    };
  }

  if (fundsThisPeriod.value > 0 && usedPercent.value > 85) {
    return {
      label: "Hampir habis",
      cls: "bg-amber-400/20 text-amber-100",
    };
  }

  return {
    label: "Aman",
    cls: "bg-emerald-400/20 text-emerald-100",
  };
});

/* ------------------------------------------------------------------ */
/* Data grafik harian                                                   */
/* ------------------------------------------------------------------ */

interface DayPoint {
  iso: string;
  income: number;
  expense: number;
  balance: number | null;
  ideal: number;
  isFuture: boolean;
  isToday: boolean;
}

const dayPoints = computed<DayPoint[]>(() => {
  const { startDate, totalDays, today } = period.value;

  const incomeMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();

  for (const transaction of periodTransactions.value) {
    const map = transaction.type === "income" ? incomeMap : expenseMap;

    map.set(
      transaction.transaction_date,
      (map.get(transaction.transaction_date) ?? 0) + amountOf(transaction),
    );
  }

  const points: DayPoint[] = [];
  let runningBalance = openingBalance.value;

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(startDate, i);
    const iso = toISO(date);
    const income = incomeMap.get(iso) ?? 0;
    const expense = expenseMap.get(iso) ?? 0;
    const isFuture = iso > today;

    runningBalance += income - expense;

    points.push({
      iso,
      income,
      expense,
      balance: isFuture ? null : runningBalance,
      ideal: Math.max(fundsThisPeriod.value, 0) * (1 - (i + 1) / totalDays),
      isFuture,
      isToday: iso === today,
    });
  }

  return points;
});

/* ------------------------------------------------------------------ */
/* Geometri grafik SVG                                                  */
/* ------------------------------------------------------------------ */

const W = 760;
const H = 300;
const PAD = {
  top: 16,
  right: 16,
  bottom: 32,
  left: 56,
};

const innerW = W - PAD.left - PAD.right;
const innerH = H - PAD.top - PAD.bottom;

const niceStep = (max: number) => {
  const raw = Math.max(max, 1) / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const factor = raw / power;

  const niceFactor = factor <= 1 ? 1 : factor <= 2 ? 2 : factor <= 5 ? 5 : 10;

  return niceFactor * power;
};

const yScale = computed(() => {
  const values = dayPoints.value.flatMap((day) => [
    day.expense,
    day.balance ?? 0,
    day.ideal,
  ]);

  const rawMax = Math.max(...values, fundsThisPeriod.value, 1);

  const rawMin = Math.min(...values, 0);
  const step = niceStep(rawMax - rawMin);
  const max = Math.ceil(rawMax / step) * step;
  const min = Math.floor(rawMin / step) * step;

  const ticks: number[] = [];

  for (let value = min; value <= max + step * 0.001; value += step) {
    ticks.push(value);
  }

  return { min, max, ticks };
});

const yPos = (value: number) => {
  const { min, max } = yScale.value;
  const range = max - min || 1;

  return PAD.top + innerH - ((value - min) / range) * innerH;
};

const band = computed(() => innerW / Math.max(dayPoints.value.length, 1));

const xCenter = (index: number) => PAD.left + band.value * (index + 0.5);

const barWidth = computed(() => Math.max(Math.min(band.value * 0.6, 18), 3));

const balanceLine = computed(() =>
  dayPoints.value
    .map((day, index) =>
      day.balance === null ? null : `${xCenter(index)},${yPos(day.balance)}`,
    )
    .filter((point): point is string => point !== null)
    .join(" "),
);

const balanceArea = computed(() => {
  const points = dayPoints.value
    .map((day, index) =>
      day.balance === null
        ? null
        : {
            x: xCenter(index),
            y: yPos(day.balance),
          },
    )
    .filter((point): point is { x: number; y: number } => point !== null);

  if (points.length < 2) {
    return "";
  }

  const base = yPos(Math.max(yScale.value.min, 0));
  const first = points[0]!;
  const last = points[points.length - 1]!;

  return (
    `M ${first.x},${base} ` +
    points.map((point) => `L ${point.x},${point.y}`).join(" ") +
    ` L ${last.x},${base} Z`
  );
});

const idealLine = computed(() =>
  dayPoints.value
    .map((day, index) => `${xCenter(index)},${yPos(day.ideal)}`)
    .join(" "),
);

const lastBalancePoint = computed(() => {
  for (let i = dayPoints.value.length - 1; i >= 0; i--) {
    const day = dayPoints.value[i]!;

    if (day.balance !== null) {
      return {
        x: xCenter(i),
        y: yPos(day.balance),
      };
    }
  }

  return null;
});

const xLabels = computed(() =>
  dayPoints.value
    .map((day, index) => ({
      i: index,
      iso: day.iso,
    }))
    .filter(
      ({ i }) => i === 0 || i % 5 === 0 || i === dayPoints.value.length - 1,
    )
    .filter(
      ({ i }) =>
        i === 0 ||
        i === dayPoints.value.length - 1 ||
        dayPoints.value.length - 1 - i >= 3,
    ),
);

const hovered = computed(() =>
  hoverIndex.value === null
    ? null
    : (dayPoints.value[hoverIndex.value] ?? null),
);

const tooltipStyle = computed(() => {
  if (hoverIndex.value === null) {
    return {};
  }

  const leftPercent = (xCenter(hoverIndex.value) / W) * 100;

  const flip = leftPercent > 62;

  return {
    left: `${leftPercent}%`,
    transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
  };
});

const hasChartData = computed(
  () => fundsThisPeriod.value !== 0 || periodExpense.value > 0,
);

/* ------------------------------------------------------------------ */
/* Riwayat transaksi dan pagination                                     */
/* ------------------------------------------------------------------ */

const sortedTransactions = computed(() =>
  [...transactions.value].sort(
    (a, b) =>
      b.transaction_date.localeCompare(a.transaction_date) ||
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
  ),
);

const totalPages = computed(() =>
  Math.max(Math.ceil(sortedTransactions.value.length / PER_PAGE), 1),
);

const paginatedTransactions = computed(() => {
  const startIndex = (currentPage.value - 1) * PER_PAGE;

  return sortedTransactions.value.slice(startIndex, startIndex + PER_PAGE);
});

const rangeText = computed(() => {
  const total = sortedTransactions.value.length;

  if (total === 0) {
    return "0 data";
  }

  const from = (currentPage.value - 1) * PER_PAGE + 1;

  const to = Math.min(currentPage.value * PER_PAGE, total);

  return `${from}–${to} dari ${total} transaksi`;
});

const pageNumbers = computed<(number | "...")[]>(() => {
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  for (
    let page = Math.max(2, current - 1);
    page <= Math.min(total - 1, current + 1);
    page++
  ) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
});

const goToPage = (page: number) => {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value);
};

watch(totalPages, (total) => {
  if (currentPage.value > total) {
    currentPage.value = total;
  }
});

/* ------------------------------------------------------------------ */
/* Lifecycle                                                            */
/* ------------------------------------------------------------------ */

let initialLoadDone = false;

onMounted(() => {
  initialLoadDone = true;
  void loadTransactions();
});

onActivated(() => {
  // onActivated hanya diperlukan ketika halaman menggunakan KeepAlive.
  // Hindari pemanggilan ganda saat pertama kali mounted.
  if (initialLoadDone) {
    void loadTransactions();
  } else {
    initialLoadDone = true;
  }
});
</script>

<template>
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
      <div
        class="absolute bottom-10 right-10 h-80 w-80 transform-gpu rounded-full bg-sky-200/20 blur-[100px]"
      ></div>
    </div>
  </Teleport>

  <DashboardLayout title="Dashboard" subtitle="Ringkasan keuangan kamu">
    <div class="relative min-h-full">
      <!-- Header -->
      <div
        class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div class="flex items-center gap-2 text-sm text-slate-500">
          <CalendarClock :size="16" />
          <span>
            Periode gajian {{ periodLabel }}
            <template v-if="period.salaryDate">
              · dihitung dari gaji {{ formatShortDate(period.salaryDate) }}
            </template>
          </span>
        </div>

        <button
          type="button"
          :disabled="loading"
          class="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          @click="loadTransactions"
        >
          <RefreshCw :size="16" :class="loading ? 'animate-spin' : ''" />
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

      <!-- Budget sampai gajian -->
      <div
        v-if="loading"
        class="mb-6 h-48 animate-pulse rounded-2xl bg-slate-200"
      ></div>

      <section
        v-else
        class="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 p-5 text-white shadow-lg sm:p-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm text-indigo-100">
              Boleh dipakai per hari sampai gajian
            </p>
            <p class="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
              {{ formatRupiah(dailyBudget) }}
            </p>
          </div>

          <span
            class="rounded-full px-3 py-1 text-xs font-semibold"
            :class="status.cls"
          >
            {{ status.label }}
          </span>
        </div>

        <!-- Progress -->
        <div class="mt-6">
          <div class="flex justify-between text-xs text-indigo-100">
            <span>Terpakai {{ formatRupiah(periodExpense) }}</span>
            <span
              >{{ usedPercent }}% dari {{ formatRupiah(fundsThisPeriod) }}</span
            >
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="usedPercent > 85 ? 'bg-amber-300' : 'bg-white'"
              :style="{ width: `${usedPercent}%` }"
            ></div>
          </div>
        </div>

        <!-- Rincian perhitungan -->
        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p class="text-xs text-indigo-200">Dana periode ini</p>
            <p class="mt-1 text-lg font-bold">
              {{ formatRupiah(fundsThisPeriod) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-indigo-200">
              Biaya tetap (kos, bensin, dll)
            </p>
            <p class="mt-1 text-lg font-bold">
              − {{ formatRupiah(fixedExpenseTotal) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-indigo-200">Sisa dana jajan</p>
            <p class="mt-1 text-lg font-bold">
              {{ formatRupiah(remainingDailyPool) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-indigo-200">Dibagi sisa hari</p>
            <p class="mt-1 text-lg font-bold">
              {{ period.daysLeft }} hari
              <span class="text-xs font-normal text-indigo-200">
                (sampai {{ formatShortDate(period.end) }})
              </span>
            </p>
          </div>
        </div>

        <!-- Hari ini -->
        <div class="mt-5 rounded-xl bg-white/10 px-4 py-3 text-sm">
          Hari ini terpakai
          <span class="font-semibold">{{ formatRupiah(spentToday) }}</span>
          dari jatah
          <span class="font-semibold">{{ formatRupiah(dailyBudget) }}</span
          >,
          <span
            class="font-semibold"
            :class="todayLeft >= 0 ? 'text-emerald-200' : 'text-amber-200'"
          >
            {{ todayLeft >= 0 ? "sisa" : "lebih" }}
            {{ formatRupiah(Math.abs(todayLeft)) }}
          </span>
        </div>

        <p
          v-if="spentToday > dailyBudget && dailyBudget > 0"
          class="mt-4 text-xs font-semibold text-amber-200"
        >
          Pengeluaran harian hari ini melebihi jatah.
        </p>
        <p
          v-if="poolForDaily < 0"
          class="mt-2 text-xs font-semibold text-amber-200"
        >
          Dana belum cukup menutup biaya tetap dan pengeluaran sebelumnya.
        </p>
        <p
          v-if="remainingBudget < 0"
          class="mt-2 text-xs font-semibold text-amber-200"
        >
          Pengeluaran sudah melebihi pemasukan di periode ini.
        </p>
        <p
          v-if="fundsThisPeriod <= 0 && upcomingCount > 0"
          class="mt-2 text-xs text-amber-200"
        >
          Ada {{ upcomingCount }} transaksi bertanggal setelah
          {{ formatDate(period.end) }}, jadi belum dihitung di periode ini. Cek
          tanggal gaji yang kamu catat.
        </p>
        <p
          v-else-if="fundsThisPeriod <= 0"
          class="mt-2 text-xs text-indigo-100"
        >
          Belum ada dana di periode ini. Catat gaji sebagai uang masuk dengan
          tanggal {{ formatDate(period.end) }} atau sebelumnya.
        </p>
        <p
          v-if="period.daysLeft === 1 && fundsThisPeriod > 0"
          class="mt-2 text-xs text-indigo-100"
        >
          Hari terakhir periode anggaran. Besok tanggal {{ PAYDAY }}, periode
          gajian baru dimulai.
        </p>
      </section>

      <!-- SUMMARY CARDS -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <template v-else>
          <!-- Saldo -->
          <div
            class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
            >
              <Wallet :size="21" />
            </div>
            <p class="mt-5 text-sm text-slate-500">Total saldo</p>
            <p class="mt-1 break-words text-2xl font-bold text-slate-900">
              {{ formatRupiah(balance) }}
            </p>
          </div>

          <!-- Income -->
          <div
            class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
            >
              <ArrowDownToLine :size="21" />
            </div>
            <p class="mt-5 text-sm text-slate-500">Uang masuk periode ini</p>
            <p class="mt-1 break-words text-2xl font-bold text-emerald-600">
              {{ formatRupiah(periodIncome) }}
            </p>
          </div>

          <!-- Expense -->
          <div
            class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600"
            >
              <ArrowUpFromLine :size="21" />
            </div>
            <p class="mt-5 text-sm text-slate-500">Uang keluar periode ini</p>
            <p class="mt-1 break-words text-2xl font-bold text-red-600">
              {{ formatRupiah(periodExpense) }}
            </p>
          </div>

          <!-- Selisih -->
          <div
            class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
            >
              <TrendingUp :size="21" />
            </div>
            <p class="mt-5 text-sm text-slate-500">Sisa dana periode ini</p>
            <p
              class="mt-1 break-words text-2xl font-bold"
              :class="remainingBudget >= 0 ? 'text-blue-600' : 'text-red-600'"
            >
              {{ formatRupiah(remainingBudget) }}
            </p>
          </div>
        </template>
      </div>

      <!-- Chart + actions -->
      <div class="mt-6 grid gap-6 xl:grid-cols-3">
        <!-- Chart -->
        <div
          class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6 xl:col-span-2"
        >
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <h2 class="font-semibold text-slate-900">
                Arus uang sampai gajian
              </h2>
              <p class="text-sm text-slate-500">
                Saldo harian dibandingkan jalur ideal, plus pengeluaran per hari
              </p>
            </div>

            <!-- Legend -->
            <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <li class="flex items-center gap-1.5">
                <span class="h-0.5 w-4 rounded bg-indigo-600"></span>
                Saldo
              </li>
              <li class="flex items-center gap-1.5">
                <span
                  class="h-0 w-4 border-t-2 border-dashed border-slate-400"
                ></span>
                Jalur ideal
              </li>
              <li class="flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-sm bg-red-400"></span>
                Pengeluaran
              </li>
            </ul>
          </div>

          <div class="mt-6">
            <div
              v-if="loading"
              class="h-64 animate-pulse rounded-xl bg-slate-100"
            ></div>

            <div v-else class="relative">
              <svg
                :viewBox="`0 0 ${W} ${H}`"
                class="h-auto w-full select-none"
                role="img"
                aria-label="Grafik saldo dan pengeluaran harian selama periode gajian"
                @mouseleave="hoverIndex = null"
              >
                <defs>
                  <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stop-color="#4f46e5"
                      stop-opacity="0.25"
                    />
                    <stop offset="100%" stop-color="#4f46e5" stop-opacity="0" />
                  </linearGradient>
                </defs>

                <!-- Grid + sumbu Y -->
                <g>
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
                </g>

                <!-- Highlight hari yang di-hover -->
                <rect
                  v-if="hoverIndex !== null"
                  :x="PAD.left + band * hoverIndex"
                  :y="PAD.top"
                  :width="band"
                  :height="innerH"
                  fill="#6366f1"
                  fill-opacity="0.07"
                />

                <!-- Penanda hari ini -->
                <line
                  v-if="
                    period.dayIndex >= 0 && period.dayIndex < dayPoints.length
                  "
                  :x1="xCenter(period.dayIndex)"
                  :x2="xCenter(period.dayIndex)"
                  :y1="PAD.top"
                  :y2="PAD.top + innerH"
                  stroke="#6366f1"
                  stroke-opacity="0.35"
                  stroke-dasharray="2 3"
                />

                <!-- Bar pengeluaran harian -->
                <rect
                  v-for="(d, i) in dayPoints"
                  v-show="d.expense > 0"
                  :key="'bar-' + d.iso"
                  :x="xCenter(i) - barWidth / 2"
                  :y="yPos(d.expense)"
                  :width="barWidth"
                  :height="Math.max(yPos(0) - yPos(d.expense), 0)"
                  rx="2"
                  fill="#f87171"
                  fill-opacity="0.85"
                />

                <!-- Jalur ideal -->
                <polyline
                  :points="idealLine"
                  fill="none"
                  stroke="#94a3b8"
                  stroke-width="1.5"
                  stroke-dasharray="5 4"
                />

                <!-- Area + garis saldo -->
                <path
                  v-if="balanceArea"
                  :d="balanceArea"
                  fill="url(#balanceFill)"
                />
                <polyline
                  :points="balanceLine"
                  fill="none"
                  stroke="#4f46e5"
                  stroke-width="2.5"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />

                <!-- Titik saldo terakhir -->
                <g v-if="lastBalancePoint">
                  <circle
                    :cx="lastBalancePoint.x"
                    :cy="lastBalancePoint.y"
                    r="7"
                    fill="#4f46e5"
                    fill-opacity="0.18"
                  />
                  <circle
                    :cx="lastBalancePoint.x"
                    :cy="lastBalancePoint.y"
                    r="4"
                    fill="#4f46e5"
                    stroke="#fff"
                    stroke-width="2"
                  />
                </g>

                <!-- Titik saldo hover -->
                <circle
                  v-if="
                    hovered && hovered.balance !== null && hoverIndex !== null
                  "
                  :cx="xCenter(hoverIndex)"
                  :cy="yPos(hovered.balance)"
                  r="4"
                  fill="#fff"
                  stroke="#4f46e5"
                  stroke-width="2"
                />

                <!-- Sumbu X -->
                <text
                  v-for="l in xLabels"
                  :key="'x-' + l.iso"
                  :x="xCenter(l.i)"
                  :y="H - 10"
                  text-anchor="middle"
                  class="fill-slate-400"
                  font-size="11"
                >
                  {{ formatShortDate(l.iso) }}
                </text>

                <!-- Area interaksi per hari -->
                <rect
                  v-for="(d, i) in dayPoints"
                  :key="'hit-' + d.iso"
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
                  {{ formatDate(hovered.iso) }}
                  <span
                    v-if="hovered.isToday"
                    class="ml-1 font-normal text-indigo-600"
                  >
                    (hari ini)
                  </span>
                </p>
                <dl class="mt-2 space-y-1">
                  <div class="flex justify-between gap-3">
                    <dt class="text-slate-500">Saldo</dt>
                    <dd class="font-semibold text-indigo-600">
                      {{
                        hovered.balance === null
                          ? "–"
                          : formatRupiah(hovered.balance)
                      }}
                    </dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt class="text-slate-500">Jalur ideal</dt>
                    <dd class="font-medium text-slate-700">
                      {{ formatRupiah(Math.round(hovered.ideal)) }}
                    </dd>
                  </div>
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
                </dl>
              </div>

              <p
                v-if="!hasChartData"
                class="mt-2 text-center text-xs text-slate-400"
              >
                Belum ada transaksi di periode ini.
              </p>
            </div>
          </div>

          <p class="mt-4 text-xs leading-relaxed text-slate-500">
            Kalau garis saldo ada di atas garis putus-putus, pengeluaranmu lebih
            hemat dari rencana. Kalau di bawah, kamu lebih boros dan batas
            harian akan turun.
          </p>
        </div>

        <!-- Quick Action -->
        <div
          class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur transition duration-300 hover:shadow-lg sm:p-6"
        >
          <h2 class="font-semibold text-slate-900">Tambah transaksi</h2>
          <p class="mt-1 text-sm text-slate-500">Catat transaksi baru.</p>

          <div class="mt-6 space-y-3">
            <RouterLink
              to="/income"
              class="group flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-700 transition hover:bg-emerald-100"
            >
              <ArrowDownToLine :size="20" />
              <div>
                <p class="font-semibold">Uang masuk</p>
                <p class="text-xs">Tambahkan pemasukan</p>
              </div>
            </RouterLink>

            <RouterLink
              to="/expense"
              class="group flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-700 transition hover:bg-red-100"
            >
              <ArrowUpFromLine :size="20" />
              <div>
                <p class="font-semibold">Uang keluar</p>
                <p class="text-xs">Tambahkan pengeluaran</p>
              </div>
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- TRANSACTIONS LIST -->
      <div
        class="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur"
      >
        <div
          class="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div>
            <h2 class="font-semibold text-slate-900">Riwayat transaksi</h2>
            <p class="text-sm text-slate-500">Aktivitas keuangan terbaru</p>
          </div>

          <RouterLink
            to="/reports"
            class="text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
          >
            Lihat laporan
          </RouterLink>
        </div>

        <!-- Skeleton -->
        <div v-if="loading" class="animate-pulse divide-y divide-slate-100">
          <div
            v-for="i in 3"
            :key="'skeleton-item-' + i"
            class="flex items-center justify-between p-5"
          >
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
          v-else-if="sortedTransactions.length === 0"
          class="p-10 text-center"
        >
          <Wallet :size="32" class="mx-auto text-slate-300" />
          <p class="mt-3 text-sm font-medium text-slate-600">
            Belum ada transaksi
          </p>
          <p class="mt-1 text-xs text-slate-400">
            Tambahkan pemasukan atau pengeluaran untuk mulai mencatat keuangan.
          </p>
        </div>

        <!-- List -->
        <div v-else class="divide-y divide-slate-100">
          <div
            v-for="transaction in paginatedTransactions"
            :key="transaction.id"
            class="flex flex-col gap-3 p-5 transition hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex min-w-0 items-center gap-3">
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
                <ArrowUpFromLine v-else :size="18" />
              </div>

              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-900">
                  {{ transaction.description }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ transaction.category }} ·
                  {{ formatDate(transaction.transaction_date) }}
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
              {{ transaction.type === "income" ? "+" : "-" }}
              {{ formatRupiah(Number(transaction.amount)) }}
            </p>
          </div>
        </div>

        <!-- Pagination -->
        <nav
          v-if="!loading && sortedTransactions.length > PER_PAGE"
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
              <span v-if="p === '...'" class="px-2 text-sm text-slate-400">
                …
              </span>
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
