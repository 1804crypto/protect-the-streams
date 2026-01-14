-- Create a profiles table if it doesn't exist
create table if not exists public.profiles (
    id uuid references auth.users not null primary key,
    username text unique,
    wins integer default 0,
    losses integer default 0,
    matches_played integer default 0,
    avatar_url text,
    updated_at timestamp with time zone default timezone('utc'::text, now())
);
-- Enable RLS
alter table public.profiles enable row level security;
-- Policy: Everyone can read profiles
create policy "Public profiles are viewable by everyone." on public.profiles for
select using (true);
-- Policy: Users can update their own profile
create policy "Users can update own profile." on public.profiles for
update using (auth.uid() = id);
-- Function to safely update stats via RPC (optional but recommended)
create or replace function public.update_pvp_stats(player_id uuid, is_win boolean) returns void as $$ begin
update public.profiles
set wins = wins + (
        case
            when is_win then 1
            else 0
        end
    ),
    losses = losses + (
        case
            when is_win then 0
            else 1
        end
    ),
    matches_played = matches_played + 1,
    updated_at = now()
where id = player_id;
end;
$$ language plpgsql security definer;