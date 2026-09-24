import { supabase } from '../lib/supabase'
import type { Transaction, TransactionFormData } from '../types/transaction'

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  administrators: number
  totalTransactions: number
}

export interface UserProfile {
  id: string
  email?: string
  role: 'user' | 'admin'
  created_at: string
}

export interface AdminTransactionPage {
  data: Transaction[]
  total: number
}

export const getAdminStats = async (): Promise<AdminStats> => {
  const [
    totalUsersResult,
    activeUsersResult,
    administratorsResult,
    transactionsResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('transactions').select('*', { count: 'exact', head: true }),
  ])

  if (totalUsersResult.error) throw new Error(totalUsersResult.error.message)
  if (activeUsersResult.error) throw new Error(activeUsersResult.error.message)
  if (administratorsResult.error) throw new Error(administratorsResult.error.message)
  if (transactionsResult.error) throw new Error(transactionsResult.error.message)

  return {
    totalUsers: totalUsersResult.count ?? 0,
    activeUsers: activeUsersResult.count ?? 0,
    administrators: administratorsResult.count ?? 0,
    totalTransactions: transactionsResult.count ?? 0,
  }
}

export const getAdminUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as UserProfile[]
}

export const getAdminTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Transaction[]
}

export const adminCreateTransaction = async (
  userId: string,
  type: 'income' | 'expense',
  formData: TransactionFormData
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type,
      description: formData.description,
      category: formData.category,
      amount: formData.amount,
      transaction_date: formData.transaction_date,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Transaction
}

export const adminUpdateTransaction = async (
  id: number,
  formData: TransactionFormData
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .update({
      description: formData.description,
      category: formData.category,
      amount: formData.amount,
      transaction_date: formData.transaction_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Transaction
}

export const adminDeleteTransaction = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}