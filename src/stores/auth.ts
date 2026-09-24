import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User, Session } from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'
import {
  getSession,
  logout as logoutService,
} from '../services/auth.service'

import type { Profile } from '../types/profile'

export const useAuthStore = defineStore('auth', () => {
  // =========================
  // STATE
  // =========================

  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<Profile | null>(null)

  const loading = ref(true)
  const initialized = ref(false)

  // Menyimpan referensi subscription auth state change untuk mencegah memory leak
  let authSubscription: any = null

  // =========================
  // COMPUTED
  // =========================

  const isAuthenticated = computed(() => {
    return !!user.value
  })

  const isAdmin = computed(() => {
    return profile.value?.role === 'admin'
  })

  // =========================
  // PROFILE
  // =========================

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Gagal mengambil profile:', error.message)
        profile.value = null
        return
      }

      profile.value = data as Profile
    } catch (err) {
      console.error('Kesalahan tak terduga saat memuat profile:', err)
      profile.value = null
    }
  }

  // =========================
  // REGISTER (Aman & Validasi Email Terdaftar)
  // =========================

  const register = async (email: string, password: string, fullName: string) => {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        // Supabase mengembalikan error jika email sudah terdaftar atau format tidak valid
        return { success: false, message: error.message }
      }

      return { success: true, data }
    } catch (err: any) {
      return { success: false, message: err.message || 'Terjadi kesalahan saat registrasi' }
    } finally {
      loading.value = false
    }
  }

  // =========================
  // INITIALIZE AUTH
  // =========================

  const init = async () => {
    if (initialized.value) {
      return
    }

    loading.value = true

    try {
      const currentSession = await getSession()

      session.value = currentSession
      user.value = currentSession?.user ?? null

      if (currentSession?.user) {
        await loadProfile(currentSession.user.id)
      } else {
        profile.value = null
      }

      // =========================
      // AUTH STATE LISTENER
      // =========================
      // Daftarkan listener hanya sekali untuk mencegah duplikasi event
      if (!authSubscription) {
        const { data } = supabase.auth.onAuthStateChange(
          (_event, newSession) => {
            session.value = newSession
            user.value = newSession?.user ?? null

            if (!newSession?.user) {
              profile.value = null
              return
            }

            setTimeout(() => {
              void loadProfile(newSession.user.id)
            }, 0)
          },
        )
        authSubscription = data.subscription
      }

      initialized.value = true
    } catch (error) {
      console.error('Gagal menginisialisasi auth:', error)

      user.value = null
      session.value = null
      profile.value = null

      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  // =========================
  // LOGOUT
  // =========================

  const logout = async () => {
    try {
      await logoutService()
    } catch (error) {
      console.error('Gagal saat proses logout:', error)
    } finally {
      user.value = null
      session.value = null
      profile.value = null
    }
  }

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
  }
})