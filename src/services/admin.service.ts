import { supabase } from '../lib/supabase'
import type { Transaction } from '../types/transaction'

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  administrators: number
  totalTransactions: number
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
    supabase
      .from('profiles')
      .select('*', {
        count: 'exact',
        head: true,
      }),

    supabase
      .from('profiles')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('role', 'user'),

    supabase
      .from('profiles')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('role', 'admin'),

    supabase
      .from('transactions')
      .select('*', {
        count: 'exact',
        head: true,
      }),
  ])

  if (totalUsersResult.error) {
    throw new Error(totalUsersResult.error.message)
  }

  if (activeUsersResult.error) {
    throw new Error(activeUsersResult.error.message)
  }

  if (administratorsResult.error) {
    throw new Error(administratorsResult.error.message)
  }

  if (transactionsResult.error) {
    throw new Error(transactionsResult.error.message)
  }

  return {
    totalUsers: totalUsersResult.count ?? 0,
    activeUsers: activeUsersResult.count ?? 0,
    administrators: administratorsResult.count ?? 0,
    totalTransactions: transactionsResult.count ?? 0,
  }
}

export const getAdminTransactions = async (
  page = 1,
  pageSize = 5,
): Promise<AdminTransactionPage> => {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const {
    data,
    count,
    error,
  } = await supabase
    .from('transactions')
    .select('*', {
      count: 'exact',
    })
    .order('transaction_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })
    .range(from, to)

  if (error) {
    throw new Error(error.message)
  }

  return {
    data: (data ?? []) as Transaction[],
    total: count ?? 0,
  }
}