import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const authStore = useAuthStore()

watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (!isAuth && authStore.initialized) {
      void router.replace('/login')
    }
  },
)