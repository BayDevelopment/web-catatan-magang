<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Kalau sesi berakhir (logout dari tab lain, token expired), arahkan ke login
watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (!isAuth && authStore.initialized) {
      void router.replace('/login')
    }
  },
)
</script>

<template>
  <RouterView />
</template>