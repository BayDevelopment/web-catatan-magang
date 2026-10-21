import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { User, Session } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import { getSession, logout as logoutService } from "../services/auth.service";

import type { Profile } from "../types/profile";

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

  // =========================
  // COMPUTED
  // =========================

  const isAuthenticated = computed(() => !!user.value);

  const isAdmin = computed(() => profile.value?.role === "admin");

  // =========================
  // CLEAR AUTH
  // =========================

  const clearAuth = () => {
    profileCheckId++;

    user.value = null;
    session.value = null;
    profile.value = null;
  };

  // Logout paksa saat akun atau profil sudah tidak tersedia.
  const forceLogout = async () => {
    clearAuth();

    try {
      // Hapus sesi lokal meskipun sesi server bermasalah.
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("Gagal membersihkan sesi:", error);
    } finally {
      clearAuth();

      if (typeof window !== "undefined") {
        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }
      }
    }
  };

  // =========================
  // PROFILE
  // =========================

  // true  = profil ditemukan
  // false = profil tidak ditemukan
  // null  = query gagal, misalnya karena masalah jaringan
  const loadProfile = async (userId: string): Promise<boolean | null> => {
    const currentCheckId = ++profileCheckId;

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
        email,
        password,
        options: {
          data: {
            full_name: fullName,
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

  const init = async () => {
    if (initialized.value) {
      return;
    }

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

      // Daftarkan listener hanya sekali.
      if (!authSubscription) {
        const { data } = supabase.auth.onAuthStateChange(
          (_event, newSession) => {
            session.value = newSession;
            user.value = newSession?.user ?? null;

            if (!newSession?.user) {
              clearAuth();
              return;
            }

            const userId = newSession.user.id;

            // Jalankan query setelah callback auth selesai.
            setTimeout(() => {
              void (async () => {
                const profileExists = await loadProfile(userId);

                if (profileExists === false) {
                  await forceLogout();
                }
              })();
            }, 0);
          },
        );

        authSubscription = data.subscription;
      }

      initialized.value = true;
    } catch (error) {
      console.error("Gagal menginisialisasi autentikasi:", error);

      clearAuth();
      initialized.value = true;
    } finally {
      loading.value = false;
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

    init,
    register,
    logout,
    loadProfile,
  };
});
