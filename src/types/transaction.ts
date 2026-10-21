export type TransactionType = "income" | "expense";

export interface Transaction {
  id: number;
  user_id: string;
  type: TransactionType;
  description: string;
  category: string;
  amount: number;
  transaction_date: string;
  is_salary?: boolean | null;
  is_fixed?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionFormData {
  description: string;
  category: string;
  amount: number;
  transaction_date: string;
  is_salary?: boolean;
  is_fixed?: boolean;
}
