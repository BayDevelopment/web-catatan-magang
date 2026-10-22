import { supabase } from "../lib/supabase";
import type {
  Transaction,
  TransactionType,
  TransactionFormData,
} from "../types/transaction";

/**
 * Helper internal untuk memastikan user benar-benar login dan mengambil ID-nya.
 */
const getAuthenticatedUser = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Sesi kedaluwarsa atau kamu harus login terlebih dahulu.");
  }

  return user;
};

/**
 * Validasi nominal: harus angka yang valid dan lebih besar dari 0.
 * (NaN <= 0 bernilai false, jadi NaN harus dicek terpisah.)
 */
const assertValidAmount = (amount: unknown) => {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Jumlah nominal harus lebih besar dari 0.");
  }
};

export const getTransactions = async (
  type?: TransactionType,
): Promise<Transaction[]> => {
  // 1. Wajib cek sesi user agar tidak sembarangan meloloskan query
  const user = await getAuthenticatedUser();

  let query = supabase
    .from("transactions")
    .select("*") // termasuk kolom is_salary dan is_fixed
    .eq("user_id", user.id) // Filter ketat: Hanya ambil data milik user yang sedang aktif
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Gagal memuat transaksi: ${error.message}`);
  }

  return (data ?? []) as Transaction[];
};

export const createTransaction = async (
  type: TransactionType,
  formData: TransactionFormData,
): Promise<Transaction> => {
  const user = await getAuthenticatedUser();

  // Validasi tambahan di sisi client sebelum dikirim ke database
  assertValidAmount(formData.amount);

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id, // Dipastikan terikat ke user yang sedang login
      type,
      description: formData.description.trim(),
      category: formData.category,
      amount: formData.amount,
      transaction_date: formData.transaction_date,
      // Flag hanya relevan sesuai jenisnya.
      // null = belum ditentukan, Dashboard akan menebak dari kata kunci.
      is_salary: type === "income" ? (formData.is_salary ?? null) : null,
      is_fixed: type === "expense" ? (formData.is_fixed ?? null) : null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal menyimpan transaksi: ${error.message}`);
  }

  return data as Transaction;
};

export const updateTransaction = async (
  id: number,
  formData: TransactionFormData,
): Promise<Transaction> => {
  const user = await getAuthenticatedUser();

  assertValidAmount(formData.amount);

  // Flag hanya ikut diperbarui jika memang dikirim,
  // supaya edit biasa tidak menimpa flag yang sudah tersimpan.
  const flagUpdates: { is_salary?: boolean; is_fixed?: boolean } = {};

  if (formData.is_salary !== undefined) {
    flagUpdates.is_salary = formData.is_salary;
  }

  if (formData.is_fixed !== undefined) {
    flagUpdates.is_fixed = formData.is_fixed;
  }

  // Keamanan tingkat tinggi: Tambahkan .eq('user_id', user.id)
  // Ini mencegah user mengedit data milik orang lain meskipun ID transaksinya diketahui
  const { data, error } = await supabase
    .from("transactions")
    .update({
      description: formData.description.trim(),
      category: formData.category,
      amount: formData.amount,
      transaction_date: formData.transaction_date,
      ...flagUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id) // Proteksi IDOR / Cross-user modification
    .select()
    .maybeSingle(); // 0 baris menghasilkan data null, bukan error PGRST116

  if (error) {
    throw new Error(`Gagal memperbarui transaksi: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      "Transaksi tidak ditemukan atau kamu tidak memiliki akses untuk mengubahnya.",
    );
  }

  return data as Transaction;
};

export const deleteTransaction = async (id: number): Promise<void> => {
  const user = await getAuthenticatedUser();

  // Proteksi IDOR: Pastikan yang dihapus benar-benar milik user yang login
  const { error, count } = await supabase
    .from("transactions")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Gagal menghapus transaksi: ${error.message}`);
  }

  if (count === 0) {
    throw new Error(
      "Transaksi tidak ditemukan atau kamu tidak memiliki akses untuk menghapusnya.",
    );
  }
};
