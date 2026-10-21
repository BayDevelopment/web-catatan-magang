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
/* Konfigurasi                                                        */
/* ------------------------------------------------------------------ */
const PAYDAY = 22; // tanggal gajian
const PER_PAGE = 5; // jumlah transaksi per halaman

/* ------------------------------------------------------------------ */
/* State                                                              */
/* ------------------------------------------------------------------ */
const transactions = ref<Transaction[]>([]);
const loading = ref(true);
const errorMessage = ref("");
const currentPage = ref(1);
const hoverIndex = ref<number | null>(null);

/* ------------------------------------------------------------------ */
/* Helper format                                                      */
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
/* Load data                                                          */
/* ------------------------------------------------------------------ */
const loadTransactions = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const data = await getTransactions();
    transactions.value = data.map((t) => ({
      ...t,
      transaction_date: String(t.transaction_date).slice(0, 10),
    }));
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
/* Saldo keseluruhan                                                  */
/* ------------------------------------------------------------------ */
const balance = computed(() =>
  transactions.value.reduce(
    (total, t) =>
      t.type === "income" ? total + Number(t.amount) : total - Number(t.amount),
    0,
  ),
);

/* ------------------------------------------------------------------ */
/* Periode gajian (Disesuaikan agar pas di tanggal gajian)              */
/* ------------------------------------------------------------------ */
const MS_DAY = 1000 * 60 * 60 * 24;

const period = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Jika hari ini sudah masuk tanggal gajian atau lebih, mulai periode dari bulan ini.
  // Jika belum, mulai dari bulan lalu.
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
  const dayIndex = Math.round((today.getTime() - start.getTime()) / MS_DAY);
  const daysLeft = Math.max(totalDays - dayIndex, 1);

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

const openingBalance = computed(() =>
  transactions.value
    .filter((t) => t.transaction_date < period.value.start)
    .reduce(
      (sum, t) =>
        t.type === "income" ? sum + Number(t.amount) : sum - Number(t.amount),
      0,
    ),
);

const upcomingCount = computed(
  () =>
    transactions.value.filter((t) => t.transaction_date > period.value.end)
      .length,
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

const fundsThisPeriod = computed(
  () => openingBalance.value + periodIncome.value,
);

const remainingBudget = computed(
  () => fundsThisPeriod.value - periodExpense.value,
);

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

const usedPercent = computed(() => {
  if (fundsThisPeriod.value <= 0) return periodExpense.value > 0 ? 100 : 0;
  return Math.min(
    Math.round((periodExpense.value / fundsThisPeriod.value) * 100),
    100,
  );
});

const status = computed(() => {
  if (remainingBudget.value < 0)
    return { label: "Defisit", cls: "bg-red-400/20 text-red-100" };
  if (fundsThisPeriod.value > 0 && usedPercent.value > 85)
    return { label: "Hampir habis", cls: "bg-amber-400/20 text-amber-100" };
  return { label: "Aman", cls: "bg-emerald-400/20 text-emerald-100" };
});

/* ------------------------------------------------------------------ */
/* Data chart: per hari dalam periode                                 */
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

  for (const t of periodTransactions.value) {
    const map = t.type === "income" ? incomeMap : expenseMap;
    map.set(
      t.transaction_date,
      (map.get(t.transaction_date) ?? 0) + Number(t.amount),
    );
  }

  const points: DayPoint[] = [];
  let running = openingBalance.value;

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
      ideal: Math.max(fundsThisPeriod.value, 0) * (1 - (i + 1) / totalDays),
      isFuture,
      isToday: iso === today,
    });
  }

  return points;
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
  const values = dayPoints.value.flatMap((d) => [
    d.expense,
    d.balance ?? 0,
    d.ideal,
  ]);
  const rawMax = Math.max(...values, fundsThisPeriod.value, 1);
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

const tooltipStyle = computed(() => {
  if (hoverIndex.value === null) return {};
  const leftPct = (xCenter(hoverIndex.value) / W) * 100;
  const flip = leftPct > 62;
  return {
    left: `${leftPct}%`,
    transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
  };
});

/* ------------------------------------------------------------------ */
/* Pagination transaksi                                               */
/* ------------------------------------------------------------------ */
const sortedTransactions = computed(() =>
  [...transactions.value].sort((a, b) => {
    const timeA = String(a.created_at ?? "").slice(11, 19) || "00:00:00";
    const timeB = String(b.created_at ?? "").slice(11, 19) || "00:00:00";
    const dateA = new Date(`${a.transaction_date}T${timeA}`).getTime();
    const dateB = new Date(`${b.transaction_date}T${timeB}`).getTime();
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

      <!-- Budget section -->
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
      </section>

      <!-- SUMMARY CARDS -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur"
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

        <div
          class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur"
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

        <div
          class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur"
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

        <div
          class="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur"
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
      </div>
    </div>
  </DashboardLayout>
</template>
