import { supabase } from '../lib/supabase'
import type {
  Transaction,
  TransactionType,
  TransactionFormData,
} from '../types/transaction'

export const getTransactions = async (
  type?: TransactionType,
): Promise<Transaction[]> => {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Transaction[]
}

export const createTransaction = async (
  type: TransactionType,
  formData: TransactionFormData,
): Promise<Transaction> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!user) {
    throw new Error('Kamu harus login terlebih dahulu.')
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
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

export const updateTransaction = async (
  id: number,
  formData: TransactionFormData,
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

export const deleteTransaction = async (
  id: number,
): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}