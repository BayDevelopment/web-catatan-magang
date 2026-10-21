<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  UserRound,
  Mail,
  ShieldCheck,
  CalendarDays,
  Save,
  LockKeyhole,
  Eye,
  EyeOff,
  LoaderCircle,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-vue-next";
import { RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types/profile";

const authStore = useAuthStore();

const profile = ref<Profile | null>(null);
const fullName = ref("");
const loading = ref(true);
const savingProfile = ref(false);
const savingPassword = ref(false);

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");

const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const successMessage = ref("");
const errorMessage = ref("");
const passwordSuccessMessage = ref("");
const passwordErrorMessage = ref("");

const userEmail = computed(() => authStore.user?.email ?? "");

const initials = computed(() => {
  const name = fullName.value.trim();

  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  return userEmail.value.charAt(0).toUpperCase() || "U";
});

const formattedCreatedAt = computed(() => {
  if (!profile.value?.created_at) return "-";

  const date = new Date(profile.value.created_at);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
});

const loadProfile = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const user = authStore.user;

    if (!user) {
      throw new Error("Sesi pengguna tidak ditemukan. Silakan login kembali.");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    profile.value = data as Profile;
    fullName.value = data.full_name ?? "";
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Gagal memuat profil pengguna.";
  } finally {
    loading.value = false;
  }
};

const saveProfile = async () => {
  successMessage.value = "";
  errorMessage.value = "";

  if (!profile.value) {
    errorMessage.value = "Data profil belum tersedia.";
    return;
  }

  const name = fullName.value.trim();

  if (!name) {
    errorMessage.value = "Nama lengkap wajib diisi.";
    return;
  }

  savingProfile.value = true;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", profile.value.id)
      .select("id, full_name, role, created_at")
      .single();

    if (error) throw error;

    profile.value = data as Profile;
    fullName.value = data.full_name ?? "";
    successMessage.value = "Profil berhasil diperbarui.";
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Gagal memperbarui profil.";
  } finally {
    savingProfile.value = false;
  }
};

const updatePassword = async () => {
  passwordSuccessMessage.value = "";
  passwordErrorMessage.value = "";

  const email = userEmail.value;

  if (!email) {
    passwordErrorMessage.value =
      "Email akun tidak ditemukan. Silakan login kembali.";
    return;
  }

  if (!currentPassword.value) {
    passwordErrorMessage.value = "Masukkan password saat ini.";
    return;
  }

  if (newPassword.value.length < 8) {
    passwordErrorMessage.value = "Password baru minimal 8 karakter.";
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordErrorMessage.value = "Konfirmasi password baru tidak cocok.";
    return;
  }

  if (currentPassword.value === newPassword.value) {
    passwordErrorMessage.value =
      "Password baru harus berbeda dari password saat ini.";
    return;
  }

  savingPassword.value = true;

  try {
    // Verifikasi password saat ini sebelum menggantinya.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword.value,
    });

    if (verifyError) {
      throw new Error("Password saat ini salah.");
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword.value,
    });

    if (updateError) throw updateError;

    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";

    passwordSuccessMessage.value = "Password berhasil diperbarui.";
  } catch (error) {
    passwordErrorMessage.value =
      error instanceof Error ? error.message : "Gagal memperbarui password.";
  } finally {
    savingPassword.value = false;
  }
};

onMounted(() => {
  void loadProfile();
});
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <RouterLink
        to="/dashboard"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        aria-label="Kembali ke dashboard"
      >
        <ArrowLeft :size="18" />
      </RouterLink>

      <div>
        <h1 class="text-2xl font-bold text-slate-900">Profil Saya</h1>
        <p class="mt-1 text-sm text-slate-500">
          Kelola informasi akun dan keamanan password.
        </p>
      </div>
    </div>

    <!-- Alerts -->
    <div
      v-if="errorMessage"
      class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      role="alert"
    >
      <AlertCircle :size="18" class="mt-0.5 shrink-0" />
      {{ errorMessage }}
    </div>

    <div
      v-if="successMessage"
      class="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
      role="status"
    >
      <CheckCircle2 :size="18" class="mt-0.5 shrink-0" />
      {{ successMessage }}
    </div>

    <div v-if="loading" class="animate-pulse space-y-4">
      <div class="h-40 rounded-2xl bg-slate-200"></div>
      <div class="h-72 rounded-2xl bg-slate-200"></div>
    </div>

    <template v-else>
      <!-- Profile summary -->
      <section
        class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div
          class="h-28 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600"
        ></div>

        <div class="px-5 pb-6 sm:px-7">
          <div class="-mt-11 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div
              class="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-indigo-100 text-3xl font-bold text-indigo-700 shadow-sm"
            >
              {{ initials }}
            </div>

            <div class="min-w-0 flex-1 pb-1">
              <h2 class="break-words text-xl font-bold text-slate-900">
                {{ fullName || "Nama belum diatur" }}
              </h2>
              <p class="mt-1 break-all text-sm text-slate-500">
                {{ userEmail }}
              </p>
            </div>

            <span
              class="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold capitalize text-indigo-700"
            >
              <ShieldCheck :size="15" />
              {{ profile?.role ?? "user" }}
            </span>
          </div>
        </div>
      </section>

      <!-- Edit profile -->
      <section
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div class="mb-6">
          <h2 class="text-lg font-bold text-slate-900">Informasi Profil</h2>
          <p class="mt-1 text-sm text-slate-500">
            Perbarui nama yang ditampilkan di akun kamu.
          </p>
        </div>

        <form class="space-y-5" @submit.prevent="saveProfile">
          <div>
            <label
              for="full_name"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Nama lengkap
            </label>

            <div class="relative">
              <UserRound
                :size="18"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="full_name"
                v-model="fullName"
                type="text"
                maxlength="100"
                autocomplete="name"
                required
                placeholder="Masukkan nama lengkap"
                class="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          <div>
            <label
              for="email"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <div class="relative">
              <Mail
                :size="18"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="email"
                :value="userEmail"
                type="email"
                readonly
                class="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-500 outline-none"
              />
            </div>
            <p class="mt-1.5 text-xs text-slate-400">
              Email akun tidak diubah melalui halaman ini.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <p class="mb-2 text-sm font-medium text-slate-700">Role akun</p>
              <div
                class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm capitalize text-slate-600"
              >
                <ShieldCheck :size="17" />
                {{ profile?.role ?? "user" }}
              </div>
            </div>

            <div>
              <p class="mb-2 text-sm font-medium text-slate-700">Akun dibuat</p>
              <div
                class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
              >
                <CalendarDays :size="17" />
                {{ formattedCreatedAt }}
              </div>
            </div>
          </div>

          <div class="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              :disabled="savingProfile || !profile"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LoaderCircle
                v-if="savingProfile"
                :size="17"
                class="animate-spin"
              />
              <Save v-else :size="17" />
              {{ savingProfile ? "Menyimpan..." : "Simpan Profil" }}
            </button>
          </div>
        </form>
      </section>

      <!-- Change password -->
      <section
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div class="mb-6 flex items-start gap-3">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
          >
            <LockKeyhole :size="21" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900">Ubah Password</h2>
            <p class="mt-1 text-sm text-slate-500">
              Gunakan password yang kuat dan jangan membagikannya kepada orang
              lain.
            </p>
          </div>
        </div>

        <div
          v-if="passwordErrorMessage"
          class="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <AlertCircle :size="18" class="mt-0.5 shrink-0" />
          {{ passwordErrorMessage }}
        </div>

        <div
          v-if="passwordSuccessMessage"
          class="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          role="status"
        >
          <CheckCircle2 :size="18" class="mt-0.5 shrink-0" />
          {{ passwordSuccessMessage }}
        </div>

        <form class="space-y-5" @submit.prevent="updatePassword">
          <div>
            <label
              for="current_password"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Password saat ini
            </label>

            <div class="relative">
              <input
                id="current_password"
                v-model="currentPassword"
                :type="showCurrentPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                placeholder="Masukkan password saat ini"
                class="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                :aria-label="
                  showCurrentPassword
                    ? 'Sembunyikan password'
                    : 'Tampilkan password'
                "
                @click="showCurrentPassword = !showCurrentPassword"
              >
                <EyeOff v-if="showCurrentPassword" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </div>
          </div>

          <div>
            <label
              for="new_password"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Password baru
            </label>

            <div class="relative">
              <input
                id="new_password"
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="8"
                required
                placeholder="Minimal 8 karakter"
                class="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                :aria-label="
                  showNewPassword
                    ? 'Sembunyikan password'
                    : 'Tampilkan password'
                "
                @click="showNewPassword = !showNewPassword"
              >
                <EyeOff v-if="showNewPassword" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </div>
            <p class="mt-1.5 text-xs text-slate-400">
              Gunakan kombinasi huruf, angka, dan simbol.
            </p>
          </div>

          <div>
            <label
              for="confirm_password"
              class="mb-2 block text-sm font-medium text-slate-700"
            >
              Konfirmasi password baru
            </label>

            <div class="relative">
              <input
                id="confirm_password"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="8"
                required
                placeholder="Ulangi password baru"
                class="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                :aria-label="
                  showConfirmPassword
                    ? 'Sembunyikan password'
                    : 'Tampilkan password'
                "
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <EyeOff v-if="showConfirmPassword" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </div>
          </div>

          <div class="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              :disabled="savingPassword"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LoaderCircle
                v-if="savingPassword"
                :size="17"
                class="animate-spin"
              />
              <LockKeyhole v-else :size="17" />
              {{ savingPassword ? "Memproses..." : "Ubah Password" }}
            </button>
          </div>
        </form>
      </section>
    </template>
  </div>
</template>
