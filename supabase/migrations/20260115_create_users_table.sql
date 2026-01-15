-- Create the users table for Wallet Authentication
create table if not exists public.users (
    id uuid default gen_random_uuid() primary key,
    wallet_address text unique not null,
    username text unique,
    xp integer default 0,
    level integer default 1,
    inventory jsonb default '{}'::jsonb,
    is_banned boolean default false,
    last_login timestamp with time zone default now(),
    created_at timestamp with time zone default now()
);
-- Create index for faster lookups by wallet address
create index if not exists users_wallet_address_idx on public.users(wallet_address);
-- Enable Row Level Security
alter table public.users enable row level security;
-- Policy: Data is public read (needed for leaderboards and social features)
create policy "Users are viewable by everyone" on public.users for
select using (true);
-- Policy: Updates are restricted. 
-- Since we are verifying signatures on the backend API and using the Service Role there,
-- we don't strictly need an RLS policy for UPDATE if we only use the Service Role Key.
-- However, to prevent any accidental client-side writes if Anon Key is used:
create policy "Service Role can update everything" on public.users using (auth.role() = 'service_role') with check (auth.role() = 'service_role');