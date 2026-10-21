export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface ProfileUpdateData {
  full_name: string;
}

export interface PasswordUpdateData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}
