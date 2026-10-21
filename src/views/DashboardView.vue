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
import { computed, onMounted, ref, watch } from "vue";

import DashboardLayout from "../layouts/DashboardLayout.vue";
import { getTransactions } from "../services/transaction.service";
import type { Transaction } from "../types/transaction";

/* ------------------------------------------------------------------ */
/* Konfigurasi                                                         */
/* ------------------------------------------------------------------ */
const PAYDAY = 22; // tanggal gajian
const PER_PAGE = 5; // jumlah transaksi per halaman

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */
const transactions = ref<Transaction[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const currentPage = ref(1);
const hoverIndex = ref<number | null>(null);

/* ------------------------------------------------------------------ */
/* Helper format                                                       */
/* ------------------------------------------------------------------ */
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

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

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
        : "Gagal mengambil data transaksi.";
  } finally {
    loading.value = false;
  }
};

/* ------------------------------------------------------------------ */
/* Saldo keseluruhan                                                   */
/* ------------------------------------------------------------------ */
const balance = computed(() =>
  transactions.value.reduce(
    (total, t) =>
      t.type === "income" ? total + Number(t.amount) : total - Number(t.amount),
    0,
  ),
);

/* ------------------------------------------------------------------ */
/* Periode gajian                                                      */
/* Contoh: hari ini 10 Nov -> periode 22 Okt s/d 21 Nov                */
/* ------------------------------------------------------------------ */
const MS_DAY = 1000 * 60 * 60 * 24;

const period = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const offset = today.getDate() >= PAYDAY ? 0 : -1;
  const start = new Date(
    today.getFullYear(),
    today.getMonth() + offset,
    PAYDAY,
  );
  const nextPayday = new Date(
    start.getFullYear(),
    start.getMonth() + 1,
    PAYDAY,
  );
  const end = new Date(nextPayday);
  end.setDate(end.getDate() - 1);

  const totalDays = Math.round(
    (nextPayday.getTime() - start.getTime()) / MS_DAY,
  );
  const dayIndex = Math.round((today.getTime() - start.getTime()) / MS_DAY); // 0 = hari pertama periode
  const daysLeft = Math.max(totalDays - dayIndex, 1); // termasuk hari ini

  return {
    startDate: start,
    start: toISO(start),
    end: toISO(end),
    totalDays,
    dayIndex,
    daysLeft,
    today: toISO(today),
  };
});

const periodLabel = computed(
  () => `${formatDate(period.value.start)} – ${formatDate(period.value.end)}`,
);

const periodTransactions = computed(() =>
  transactions.value.filter(
    (t) =>
      t.transaction_date >= period.value.start &&
      t.transaction_date <= period.value.end,
  ),
);

const periodIncome = computed(() =>
  periodTransactions.value
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0),
);

const periodExpense = computed(() =>
  periodTransactions.value
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0),
);

/** Sisa uang periode ini */
const remainingBudget = computed(
  () => periodIncome.value - periodExpense.value,
);

/** Batas pengeluaran per hari agar cukup sampai gajian */
const dailyBudget = computed(() =>
  Math.max(Math.floor(remainingBudget.value / period.value.daysLeft), 0),
);

const spentToday = computed(() =>
  transactions.value
    .filter(
      (t) => t.type === "expense" && t.transaction_date === period.value.today,
    )
    .reduce((sum, t) => sum + Number(t.amount), 0),
);

/** Persentase dana yang sudah terpakai (untuk progress bar) */
const usedPercent = computed(() => {
  if (periodIncome.value <= 0) return periodExpense.value > 0 ? 100 : 0;
  return Math.min(
    Math.round((periodExpense.value / periodIncome.value) * 100),
    100,
  );
});

const status = computed(() => {
  if (remainingBudget.value < 0)
    return { label: "Defisit", cls: "bg-red-400/20 text-red-100" };
  if (periodIncome.value > 0 && usedPercent.value > 85)
    return { label: "Hampir habis", cls: "bg-amber-400/20 text-amber-100" };
  return { label: "Aman", cls: "bg-emerald-400/20 text-emerald-100" };
});

/* ------------------------------------------------------------------ */
/* Data chart: per hari dalam periode                                  */
/* ------------------------------------------------------------------ */
interface DayPoint {
  iso: string;
  income: number;
  expense: number;
  balance: number | null; // null = hari yang belum terjadi
  ideal: number;
  isFuture: boolean;
  isToday: boolean;
}

const dayPoints = computed<DayPoint[]>(() => {
  const { startDate, totalDays, today } = period.value;

  const incomeMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();

  for (const t of periodTransactions.value) {
    const map = t.type === "income" ? incomeMap : expenseMap;
    map.set(
      t.transaction_date,
      (map.get(t.transaction_date) ?? 0) + Number(t.amount),
    );
  }

  const points: DayPoint[] = [];
  let running = 0;

  for (let i = 0; i < totalDays; i++) {
    const iso = toISO(
      new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + i,
      ),
    );
    const income = incomeMap.get(iso) ?? 0;
    const expense = expenseMap.get(iso) ?? 0;
    const isFuture = iso > today;

    running += income - expense;

    points.push({
      iso,
      income,
      expense,
      balance: isFuture ? null : running,
      // jalur ideal: total pemasukan habis merata sampai hari terakhir
      ideal: periodIncome.value * (1 - (i + 1) / totalDays),
      isFuture,
      isToday: iso === today,
    });
  }

  return points;
});

/* Geometri chart (SVG) */
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
  const values = dayPoints.value.flatMap((d) => [
    d.expense,
    d.balance ?? 0,
    d.ideal,
  ]);
  const rawMax = Math.max(...values, periodIncome.value, 1);
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

const band = computed(() => innerW / dayPoints.value.length);
const xCenter = (i: number) => PAD.left + band.value * (i + 0.5);

const barWidth = computed(() => Math.max(Math.min(band.value * 0.6, 18), 3));

const balanceLine = computed(() => {
  const pts = dayPoints.value
    .map((d, i) =>
      d.balance === null ? null : `${xCenter(i)},${yPos(d.balance)}`,
    )
    .filter(Boolean) as string[];
  return pts.join(" ");
});

const balanceArea = computed(() => {
  const pts = dayPoints.value
    .map((d, i) =>
      d.balance === null ? null : { x: xCenter(i), y: yPos(d.balance) },
    )
    .filter(Boolean) as { x: number; y: number }[];

  if (pts.length < 2) return "";
  const base = yPos(Math.max(yScale.value.min, 0));
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  return (
    `M ${first.x},${base} ` +
    pts.map((p) => `L ${p.x},${p.y}`).join(" ") +
    ` L ${last.x},${base} Z`
  );
});

const idealLine = computed(() =>
  dayPoints.value.map((d, i) => `${xCenter(i)},${yPos(d.ideal)}`).join(" "),
);

const lastBalancePoint = computed(() => {
  let idx = -1;
  for (let i = dayPoints.value.length - 1; i >= 0; i--) {
    if (dayPoints.value[i]!.balance !== null) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return null;

  return {
    x: xCenter(idx),
    y: yPos(dayPoints.value[idx]!.balance as number),
  };
});

/** Label sumbu X: tampil tiap ±5 hari agar tidak berdesakan */
const xLabels = computed(() =>
  dayPoints.value
    .map((d, i) => ({ i, iso: d.iso }))
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
  hoverIndex.value === null ? null : dayPoints.value[hoverIndex.value]!,
);

/** Posisi tooltip (persen dari lebar chart) */
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
  () => periodIncome.value > 0 || periodExpense.value > 0,
);

/* ------------------------------------------------------------------ */
/* Pagination transaksi                                                */
/* ------------------------------------------------------------------ */
const sortedTransactions = computed(() =>
  [...transactions.value].sort((a, b) => {
    const dateA = new Date(
      `${a.transaction_date}T${a.created_at.slice(11, 19)}`,
    ).getTime();
    const dateB = new Date(
      `${b.transaction_date}T${b.created_at.slice(11, 19)}`,
    ).getTime();
    return dateB - dateA;
  }),
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
  if (total === 0) return "0 data";
  const from = (currentPage.value - 1) * PER_PAGE + 1;
  const to = Math.min(currentPage.value * PER_PAGE, total);
  return `${from}–${to} dari ${total} transaksi`;
});

/** Nomor halaman yang ditampilkan (dengan elipsis) */
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

watch(totalPages, (total) => {
  if (currentPage.value > total) currentPage.value = total;
});

onMounted(() => {
  void loadTransactions();
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
          <span>Periode gajian {{ periodLabel }}</span>
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
              >{{ usedPercent }}% dari {{ formatRupiah(periodIncome) }}</span
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

        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <p class="text-xs text-indigo-200">Sisa uang periode ini</p>
            <p class="mt-1 text-xl font-bold">
              {{ formatRupiah(remainingBudget) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-indigo-200">Sisa hari sampai gajian</p>
            <p class="mt-1 text-xl font-bold">
              {{ period.daysLeft }} dari {{ period.totalDays }} hari
            </p>
          </div>
          <div>
            <p class="text-xs text-indigo-200">Keluar hari ini</p>
            <p class="mt-1 text-xl font-bold">
              {{ formatRupiah(spentToday) }}
            </p>
          </div>
        </div>

        <p
          v-if="spentToday > dailyBudget && dailyBudget > 0"
          class="mt-4 text-xs font-semibold text-amber-200"
        >
          Pengeluaran hari ini melebihi batas harian.
        </p>
        <p
          v-if="remainingBudget < 0"
          class="mt-2 text-xs font-semibold text-amber-200"
        >
          Pengeluaran sudah melebihi pemasukan di periode ini.
        </p>
        <p v-if="periodIncome === 0" class="mt-2 text-xs text-indigo-100">
          Belum ada uang masuk di periode ini. Catat gaji dengan tanggal
          {{ formatShortDate(period.start) }} atau sesudahnya.
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
            <p class="mt-5 text-sm text-slate-500">Selisih periode ini</p>
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
