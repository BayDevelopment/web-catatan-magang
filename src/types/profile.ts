export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  created_at: string
}