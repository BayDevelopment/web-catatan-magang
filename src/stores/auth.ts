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
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.error(
        'Gagal mengambil profile:',
        error.message,
      )

      profile.value = null

      return
    }

    profile.value = data as Profile
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

      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          session.value = newSession
          user.value = newSession?.user ?? null

          if (!newSession?.user) {
            profile.value = null
            return
          }

          // Jangan melakukan request Supabase
          // langsung di dalam callback.
          setTimeout(() => {
            void loadProfile(newSession.user.id)
          }, 0)
        },
      )

      initialized.value = true
    } catch (error) {
      console.error(
        'Gagal menginisialisasi auth:',
        error,
      )

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
    await logoutService()

    user.value = null
    session.value = null
    profile.value = null
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
    logout,
    loadProfile,
  }
})