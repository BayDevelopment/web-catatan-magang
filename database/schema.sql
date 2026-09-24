-- database/schema.sql

-- 1. Buat tabel transaksi keuangan
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tanggal date not null,
  jumlah numeric not null,
  keterangan text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Aktifkan Row Level Security (RLS)
alter table public.transactions enable row level security;

-- 3. Policy untuk User
create policy "User bisa mengelola data keuangan mereka sendiri"
on public.transactions
for all
using (auth.uid() = user_id);