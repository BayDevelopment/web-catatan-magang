<script setup lang="ts">
import { ref } from 'vue'
import {
  Wallet,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-vue-next'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const password = ref('')

const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const login = async () => {
  errorMessage.value = ''

  if (!email.value || !password.value) {
    errorMessage.value = 'Email dan password wajib diisi.'
    return
  }

  loading.value = true

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  router.push('/dashboard')
}
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

        <h1
          class="text-2xl font-bold tracking-tight text-slate-900"
        >
          KeuanganKu
        </h1>

        <p class="mt-1 text-sm text-slate-500">
          Kelola keuangan dengan lebih mudah
        </p>

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
              <LogIn :size="20" />
            </div>

            <h2 class="text-xl font-semibold text-slate-900">
              Selamat datang kembali
            </h2>

            <p class="mt-1 text-sm text-slate-500">
              Silakan masuk ke akun kamu.
            </p>
          </div>

          <!-- Form -->
          <form
            class="mt-6 space-y-5"
            @submit.prevent="login"
          >

            <!-- Email -->
            <div>
              <label
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                v-model="email"
                type="email"
                placeholder="nama@email.com"
                autocomplete="email"
                class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <!-- Password -->
            <div>
              <label
                class="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <div class="relative">

                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Masukkan password"
                  autocomplete="current-password"
                  class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  :aria-label="
                    showPassword
                      ? 'Sembunyikan password'
                      : 'Tampilkan password'
                  "
                >
                  <EyeOff
                    v-if="showPassword"
                    :size="19"
                  />

                  <Eye
                    v-else
                    :size="19"
                  />
                </button>

              </div>
            </div>

            <!-- Error -->
            <div
              v-if="errorMessage"
              class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {{ errorMessage }}
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

              <LogIn
                v-else
                :size="18"
              />

              {{ loading ? 'Memproses...' : 'Masuk' }}
            </button>

          </form>

          <!-- Register -->
          <div
            class="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-slate-500"
          >
            Belum punya akun?

            <RouterLink
              to="/register"
              class="ml-1 font-semibold text-indigo-600 transition hover:text-indigo-700"
            >
              Daftar sekarang
            </RouterLink>
          </div>

        </div>
      </div>

      <!-- Footer -->
      <p class="mt-6 text-center text-xs text-slate-400">
        KeuanganKu · Kelola keuangan dengan lebih mudah
      </p>

    </div>
  </div>
</template>