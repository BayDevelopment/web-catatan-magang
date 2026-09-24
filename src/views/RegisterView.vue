<script setup lang="ts">
import { ref } from "vue";
import { Wallet, Eye, EyeOff } from "lucide-vue-next";
import { supabase } from "../lib/supabase";
import { useRouter } from "vue-router";
import AppAlert from "../components/AppAlert.vue";

const router = useRouter();

const fullName = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");

const showPassword = ref(false);
const loading = ref(false);

const errorMessage = ref("");
const successMessage = ref("");

const alertType = ref<"success" | "error">("error");
const alertTitle = ref("");
const alertMessage = ref("");
const showAlert = ref(false);

const showModernAlert = (
  type: "success" | "error",
  title: string,
  message: string,
) => {
  alertType.value = type;
  alertTitle.value = title;
  alertMessage.value = message;
  showAlert.value = true;
};

const validateEmail = (value: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(value);
};

const register = async () => {
  errorMessage.value = "";
  successMessage.value = "";

  const name = fullName.value.trim();
  const emailValue = email.value.trim().toLowerCase();
  const passwordValue = password.value;
  const confirmPasswordValue = confirmPassword.value;

  // =========================
  // VALIDASI FIELD KOSONG
  // =========================

  if (!name) {
    showModernAlert(
      "error",
      "Nama belum diisi",
      "Silakan masukkan nama lengkap kamu.",
    );
    return;
  }

  if (!emailValue) {
    showModernAlert(
      "error",
      "Email belum diisi",
      "Silakan masukkan alamat email kamu.",
    );
    return;
  }

  if (!passwordValue) {
    showModernAlert(
      "error",
      "Password belum diisi",
      "Silakan masukkan password.",
    );
    return;
  }

  if (!confirmPasswordValue) {
    showModernAlert(
      "error",
      "Konfirmasi password belum diisi",
      "Silakan ulangi password kamu.",
    );
    return;
  }

  // =========================
  // VALIDASI NAMA
  // =========================

  if (name.length < 2) {
    showModernAlert(
      "error",
      "Nama tidak valid",
      "Nama lengkap minimal terdiri dari 2 karakter.",
    );
    return;
  }

  // =========================
  // VALIDASI EMAIL
  // =========================

  if (!validateEmail(emailValue)) {
    showModernAlert(
      "error",
      "Email tidak valid",
      "Masukkan alamat email yang valid, contohnya nama@gmail.com.",
    );
    return;
  }

  // =========================
  // VALIDASI PASSWORD
  // =========================

  if (passwordValue.length < 6) {
    showModernAlert(
      "error",
      "Password terlalu pendek",
      "Password harus memiliki minimal 6 karakter.",
    );
    return;
  }

  // =========================
  // VALIDASI PASSWORD
  // =========================

  if (passwordValue !== confirmPasswordValue) {
    showModernAlert(
      "error",
      "Password tidak cocok",
      "Password dan konfirmasi password harus sama.",
    );
    return;
  }

  // =========================
  // PROSES REGISTER
  // =========================

  loading.value = true;

  try {
    const { data, error } = await supabase.auth.signUp({
      email: emailValue,
      password: passwordValue,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      const message = error.message.toLowerCase();

      // Email sudah terdaftar
      if (
        message.includes("already registered") ||
        message.includes("already exists") ||
        message.includes("user already registered")
      ) {
        showModernAlert(
          "error",
          "Email sudah terdaftar",
          "Email tersebut sudah memiliki akun. Silakan gunakan email lain atau masuk menggunakan akun tersebut.",
        );

        return;
      }

      // Rate limit
      if (
        message.includes("rate limit") ||
        message.includes("too many requests")
      ) {
        showModernAlert(
          "error",
          "Terlalu banyak percobaan",
          "Terlalu banyak permintaan dalam waktu singkat. Tunggu beberapa saat sebelum mencoba lagi.",
        );

        return;
      }

      // Email invalid
      if (message.includes("invalid") && message.includes("email")) {
        showModernAlert(
          "error",
          "Email tidak valid",
          "Format email tidak diterima. Gunakan alamat email yang valid seperti nama@gmail.com.",
        );

        return;
      }

      throw new Error(error.message);
    }

    // =========================
    // REGISTER BERHASIL
    // =========================

    if (data.user) {
      // Cek apakah email konfirmasi aktif atau tidak di Supabase
      const messageText = data.session
        ? "Akun kamu berhasil dibuat. Silakan masuk."
        : "Akun berhasil dibuat. Silakan cek email untuk verifikasi, lalu masuk.";

      showModernAlert("success", "Registrasi Berhasil", messageText);

      // Beri jeda 1.5 detik agar alert terbaca, lalu arahkan ke halaman login
      setTimeout(() => {
        router.push("/login");
      }, 1500);

      return;
    }

    showModernAlert(
      "error",
      "Registrasi gagal",
      "Akun tidak berhasil dibuat. Silakan coba lagi.",
    );
  } catch (error) {
    console.error("Register error:", error);

    showModernAlert(
      "error",
      "Registrasi gagal",
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan. Silakan coba lagi.",
    );
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10"
  >
    <!-- Background blobs -->
    <div
      class="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl"
    ></div>

    <div
      class="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl"
    ></div>

    <div
      class="pointer-events-none absolute bottom-[-10rem] left-1/4 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl"
    ></div>

    <div
      class="pointer-events-none absolute bottom-[-8rem] right-1/4 h-80 w-80 rounded-full bg-indigo-100/50 blur-3xl"
    ></div>

    <!-- Content -->
    <div class="relative z-10 w-full max-w-md">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <Wallet :size="28" />
        </div>

        <h1 class="text-2xl font-bold tracking-tight text-slate-900">
          KeuanganKu
        </h1>

        <p class="mt-1 text-sm text-slate-500">Buat akun baru</p>
      </div>

      <!-- Card -->
      <div
        class="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl sm:p-8"
      >
        <!-- Card blobs -->
        <div
          class="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-100/60 blur-3xl"
        ></div>

        <div
          class="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-violet-100/50 blur-3xl"
        ></div>

        <div class="relative">
          <!-- Header -->
          <div>
            <div
              class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"
            >
              <Wallet :size="20" />
            </div>

            <h2 class="text-xl font-semibold text-slate-900">Daftar akun</h2>

            <p class="mt-1 text-sm text-slate-500">
              Mulai kelola keuangan kamu.
            </p>
          </div>

          <!-- Form -->
          <form class="mt-6 space-y-5" @submit.prevent="register">
            <!-- Nama -->
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">
                Nama lengkap
              </label>

              <input
                v-model="fullName"
                type="text"
                required
                autocomplete="name"
                placeholder="Nama kamu"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <!-- Email -->
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                v-model="email"
                type="email"
                required
                autocomplete="email"
                placeholder="nama@email.com"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <!-- Password -->
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>

              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="new-password"
                  placeholder="Minimal 6 karakter"
                  class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  :aria-label="
                    showPassword ? 'Sembunyikan password' : 'Tampilkan password'
                  "
                >
                  <EyeOff v-if="showPassword" :size="19" />

                  <Eye v-else :size="19" />
                </button>
              </div>
            </div>

            <!-- Confirm Password -->
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">
                Konfirmasi password
              </label>

              <input
                v-model="confirmPassword"
                type="password"
                required
                autocomplete="new-password"
                placeholder="Ulangi password"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <!-- Submit -->
            <button
              type="submit"
              :disabled="loading"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <span
                v-if="loading"
                class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              ></span>

              <Wallet v-else :size="18" />

              {{ loading ? "Membuat akun..." : "Daftar" }}
            </button>
          </form>

          <!-- Login link -->
          <div
            class="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-slate-500"
          >
            Sudah punya akun?

            <RouterLink
              to="/login"
              class="ml-1 font-semibold text-indigo-600 transition hover:text-indigo-700"
            >
              Masuk
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <p class="mt-6 text-center text-xs text-slate-400">
        KeuanganKu · Kelola keuangan dengan lebih mudah
      </p>
    </div>

    <!-- Modern Alert -->
    <AppAlert
      v-if="showAlert"
      :type="alertType"
      :title="alertTitle"
      :message="alertMessage"
      @close="showAlert = false"
    />
  </div>
</template>
