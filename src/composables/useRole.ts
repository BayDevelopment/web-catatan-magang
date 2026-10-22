import { computed, ref } from "vue";
import { supabase } from "../lib/supabase";

export type Role = "user" | "admin";

// State dibagi ke seluruh aplikasi (module-level), jadi sidebar, router guard,
// dan halaman lain memakai satu sumber yang sama dan tidak fetch berulang.
const role = ref<Role | null>(null);
const roleUserId = ref<string | null>(null);
const loading = ref(false);

let inflight: Promise<Role | null> | null = null;

const reset = () => {
  role.value = null;
  roleUserId.value = null;
};

export const fetchRole = async (force = false): Promise<Role | null> => {
  if (!force && role.value) return role.value;
  if (inflight) return inflight;

  inflight = (async () => {
    loading.value = true;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        reset();
        return null;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Gagal tertutup: hanya 'admin' yang dianggap admin, selain itu user.
      role.value = data?.role === "admin" ? "admin" : "user";
      roleUserId.value = user.id;

      return role.value;
    } catch {
      reset();
      return null;
    } finally {
      loading.value = false;
      inflight = null;
    }
  })();

  return inflight;
};

// Sinkronkan role saat login / logout / ganti akun.
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    reset();
    return;
  }

  // Hindari reset saat token refresh atau tab difokuskan ulang (user sama).
  if (event === "SIGNED_IN" && session?.user.id !== roleUserId.value) {
    reset();
    // Jangan await query Supabase di dalam callback ini (bisa deadlock).
    setTimeout(() => void fetchRole(true), 0);
  }
});

export const useRole = () => ({
  role,
  loading,
  isAdmin: computed(() => role.value === "admin"),
  fetchRole,
});
