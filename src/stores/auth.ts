import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { User, Session } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import { getSession, logout as logoutService } from "../services/auth.service";

import type { Profile } from "../types/profile";

export type AuthResult =
  | { success: true }
  | { success: false; message: string };

const translateAuthError = (message: string) => {
  const text = message.toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "Email atau password salah.";
  }

  if (text.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Cek kotak masuk emailmu.";
  }

  return message;
};

export const useAuthStore = defineStore("auth", () => {
  // =========================
  // STATE
  // =========================

  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const profile = ref<Profile | null>(null);

  const loading = ref(true);
  const initialized = ref(false);

  let authSubscription: { unsubscribe: () => void } | null = null;

  // Mencegah proses pengecekan profil berjalan bersamaan
  let profileCheckId = 0;

  // Permintaan profil yang sedang berjalan untuk user yang sama dipakai bersama,
  // supaya login() dan listener auth tidak saling membatalkan.
  let inflightProfile: {
    userId: string;
    promise: Promise<boolean | null>;
  } | null = null;

  // init() yang dipanggil bersamaan memakai proses yang sama.
  let initPromise: Promise<void> | null = null;

  // =========================
  // COMPUTED
  // =========================

  const isAuthenticated = computed(() => !!user.value);

  const isAdmin = computed(() => profile.value?.role === "admin");

  // Halaman utama setelah login: admin ke /admin, user biasa ke /dashboard.
  const homePath = computed(() => (isAdmin.value ? "/admin" : "/dashboard"));

  // =========================
  // CLEAR AUTH
  // =========================

  const clearAuth = () => {
    profileCheckId++;
    inflightProfile = null;

    user.value = null;
    session.value = null;
    profile.value = null;
  };

  // Hapus sesi lokal tanpa mengarahkan halaman (dipakai saat login gagal).
  const dropSession = async () => {
    clearAuth();

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("Gagal membersihkan sesi:", error);
    }
  };

  // Logout paksa saat akun atau profil sudah tidak tersedia.
  const forceLogout = async () => {
    await dropSession();

    if (typeof window !== "undefined") {
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
  };

  // =========================
  // PROFILE
  // =========================

  // true  = profil ditemukan
  // false = profil tidak ditemukan
  // null  = query gagal atau hasilnya sudah usang
  const loadProfile = (userId: string): Promise<boolean | null> => {
    if (inflightProfile?.userId === userId) {
      return inflightProfile.promise;
    }

    const currentCheckId = ++profileCheckId;

    const promise: Promise<boolean | null> = (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, role, created_at")
          .eq("id", userId)
          .maybeSingle();

        // Abaikan hasil pengecekan lama.
        if (currentCheckId !== profileCheckId) {
          return null;
        }

        if (error) {
          console.error("Gagal mengambil profil:", error.message);
          return null;
        }

        // Profil tidak ada: akun tidak boleh melanjutkan sesi aplikasi.
        if (!data) {
          profile.value = null;
          return false;
        }

        profile.value = data as Profile;
        return true;
      } catch (error) {
        console.error("Kesalahan saat memuat profil:", error);
        return null;
      }
    })().finally(() => {
      if (inflightProfile?.promise === promise) {
        inflightProfile = null;
      }
    });

    inflightProfile = { userId, promise };

    return promise;
  };

  // =========================
  // LISTENER AUTH
  // =========================

  const registerAuthListener = () => {
    // Daftarkan listener hanya sekali.
    if (authSubscription) {
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      session.value = newSession;
      user.value = newSession?.user ?? null;

      if (!newSession?.user) {
        clearAuth();
        return;
      }

      // Profil dimuat oleh init() dan login().
      // Refresh token tidak mengubah profil.
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        return;
      }

      const userId = newSession.user.id;

      if (profile.value?.id === userId) {
        return;
      }

      // Jalankan query setelah callback auth selesai.
      setTimeout(() => {
        void (async () => {
          if (profile.value?.id === userId) {
            return;
          }

          const profileExists = await loadProfile(userId);

          if (profileExists === false) {
            await forceLogout();
          }
        })();
      }, 0);
    });

    authSubscription = data.subscription;
  };

  // =========================
  // LOGIN
  // =========================

  // Login lewat store agar profil (role admin) sudah termuat
  // sebelum halaman tujuan ditentukan.
  const login = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    loading.value = true;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, message: translateAuthError(error.message) };
      }

      session.value = data.session;
      user.value = data.user;

      const profileExists = await loadProfile(data.user.id);

      if (profileExists === false) {
        await dropSession();

        return {
          success: false,
          message: "Profil akun tidak ditemukan. Hubungi admin.",
        };
      }

      if (profileExists === null && !profile.value) {
        await dropSession();

        return {
          success: false,
          message: "Gagal memuat profil akun. Periksa koneksi lalu coba lagi.",
        };
      }

      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        message:
          err instanceof Error ? err.message : "Terjadi kesalahan saat login.",
      };
    } finally {
      loading.value = false;
    }
  };

  // =========================
  // REGISTER
  // =========================

  const register = async (
    email: string,
    password: string,
    fullName: string,
  ) => {
    loading.value = true;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        return {
          success: false,
          message: error.message,
        };
      }

      return {
        success: true,
        data,
        // true jika konfirmasi email aktif: belum ada sesi sampai email dikonfirmasi.
        needsEmailConfirmation: !data.session,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat registrasi";

      return {
        success: false,
        message,
      };
    } finally {
      loading.value = false;
    }
  };

  // =========================
  // INITIALIZE AUTH
  // =========================

  const runInit = async () => {
    loading.value = true;

    try {
      const currentSession = await getSession();

      session.value = currentSession;
      user.value = currentSession?.user ?? null;

      if (currentSession?.user) {
        // Verifikasi akun ke server Supabase, bukan hanya sesi lokal.
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError) {
          // Sesi ditolak server: akun atau token tidak lagi valid.
          if (userError.status === 401 || userError.status === 403) {
            await forceLogout();
            return;
          }

          // Gangguan lain tidak otomatis dianggap akun terhapus.
          console.error("Gagal memverifikasi akun:", userError.message);

          const profileExists = await loadProfile(currentSession.user.id);

          if (profileExists === false) {
            await forceLogout();
            return;
          }
        } else if (!userData.user) {
          await forceLogout();
          return;
        } else {
          user.value = userData.user;

          const profileExists = await loadProfile(userData.user.id);

          if (profileExists === false) {
            await forceLogout();
            return;
          }
        }
      } else {
        profile.value = null;
      }
    } catch (error) {
      console.error("Gagal menginisialisasi autentikasi:", error);

      clearAuth();
    } finally {
      registerAuthListener();
      initialized.value = true;
      loading.value = false;
    }
  };

  const init = (): Promise<void> => {
    if (initialized.value) {
      return Promise.resolve();
    }

    if (!initPromise) {
      initPromise = runInit().finally(() => {
        initPromise = null;
      });
    }

    return initPromise;
  };

  // =========================
  // HAPUS AKUN
  // =========================

  // Verifikasi ulang password, lalu hapus akun lewat fungsi database
  // delete_my_account() yang hanya bisa menghapus akun si pemanggil sendiri.
  const deleteAccount = async (password: string): Promise<AuthResult> => {
    const email = user.value?.email;

    if (!email) {
      return {
        success: false,
        message: "Sesi tidak ditemukan. Silakan login kembali.",
      };
    }

    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (verifyError) {
        return { success: false, message: "Password salah." };
      }

      const { error } = await supabase.rpc("delete_my_account");

      if (error) {
        return { success: false, message: error.message };
      }

      // Akun sudah tidak ada: bersihkan sesi lokal saja.
      await dropSession();

      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Gagal menghapus akun.",
      };
    }
  };

  // =========================
  // LOGOUT MANUAL
  // =========================

  const logout = async () => {
    try {
      await logoutService();
    } catch (error) {
      console.error("Gagal saat proses logout:", error);
    } finally {
      clearAuth();
    }
  };

  // =========================
  // RETURN
  // =========================

  return {
    user,
    session,
    profile,

    loading,
    initialized,

    isAuthenticated,
    isAdmin,
    homePath,

    init,
    login,
    register,
    logout,
    deleteAccount,
    loadProfile,
  };
});
