import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export interface RegisterData {
  email: string
  password: string
  fullName: string
}

export const login = async (
  email: string,
  password: string,
) => {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const register = async ({
  email,
  password,
  fullName,
}: RegisterData) => {
  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const logout = async () => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

export const getSession = async (): Promise<Session | null> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw new Error(error.message)
  }

  return session
}

export const getCurrentUser = async (): Promise<User | null> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw new Error(error.message)
  }

  return user
}