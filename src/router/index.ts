import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    guestOnly?: boolean;
    requiresAdmin?: boolean;
  }
}

const router = createRouter({
  history: createWebHistory(),

  routes: [
    // =========================
    // PUBLIC / GUEST
    // =========================

    {
      path: "/login",
      name: "login",
      component: () => import("../views/LoginView.vue"),
      meta: {
        guestOnly: true,
      },
    },

    {
      path: "/register",
      name: "register",
      component: () => import("../views/RegisterView.vue"),
      meta: {
        guestOnly: true,
      },
    },

    // =========================
    // USER
    // =========================

    {
      path: "/",
      redirect: "/dashboard",
    },

    {
      path: "/dashboard",
      name: "dashboard",
      component: () => import("../views/DashboardView.vue"),
      meta: {
        requiresAuth: true,
      },
    },

    {
      path: "/income",
      name: "income",
      component: () => import("../views/IncomeView.vue"),
      meta: {
        requiresAuth: true,
      },
    },

    {
      path: "/expense",
      name: "expense",
      component: () => import("../views/ExpenseView.vue"),
      meta: {
        requiresAuth: true,
      },
    },

    {
      path: "/reports",
      name: "reports",
      component: () => import("../views/ReportsView.vue"),
      meta: {
        requiresAuth: true,
      },
    },

    // =========================
    // PROFILE
    // =========================

    {
      path: "/profile",
      name: "profile",
      component: () => import("../views/Profile.vue"),
      meta: {
        requiresAuth: true,
      },
    },

    // =========================
    // ADMIN
    // =========================

    {
      path: "/admin",
      name: "admin",
      component: () => import("../views/admin/AdminDashboardView.vue"),
      meta: {
        requiresAuth: true,
        requiresAdmin: true,
      },
    },

    // =========================
    // FALLBACK (URL tidak dikenal)
    // Belum login akan diarahkan ke login oleh route guard.
    // =========================

    {
      path: "/:pathMatch(.*)*",
      redirect: "/dashboard",
    },
  ],
});

// =========================
// ROUTE GUARD
// =========================

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  // Pastikan status login + profile sudah dimuat
  if (!authStore.initialized) {
    await authStore.init();
  }

  // =========================
  // SUDAH LOGIN
  // =========================

  // User yang sudah login tidak boleh
  // kembali ke login/register
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return {
      name: "dashboard",
    };
  }

  // =========================
  // WAJIB LOGIN
  // =========================

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: "login",
      query: {
        redirect: to.fullPath,
      },
    };
  }

  // =========================
  // WAJIB ADMIN
  // (hanya melindungi tampilan; keamanan sebenarnya ada di RLS Supabase)
  // =========================

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return {
      name: "dashboard",
    };
  }

  return true;
});

export default router;
