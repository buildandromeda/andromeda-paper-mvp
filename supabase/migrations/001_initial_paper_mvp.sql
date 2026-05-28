-- Andromeda Paper MVP initial schema.
-- Run in separate staging and production Supabase projects.

create extension if not exists "pgcrypto";

create type event_category as enum ('sports', 'weather', 'economics', 'stocks', 'crypto', 'politics', 'entertainment');
create type event_status as enum ('open', 'closed', 'resolved', 'needs_review');
create type trade_side as enum ('yes', 'no');
create type order_action as enum ('buy', 'sell');
create type alert_condition as enum ('above', 'below');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Andromeda User',
  role text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category event_category not null,
  status event_status not null default 'open',
  description text not null,
  resolution_source text not null,
  resolution_rule text not null,
  closes_at timestamptz not null,
  resolves_at timestamptz not null,
  outcome trade_side,
  created_at timestamptz not null default now()
);

create table public.event_sources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  provider text not null,
  provider_url text not null,
  label text not null,
  last_updated_at timestamptz not null,
  status text not null check (status in ('fresh', 'stale', 'down'))
);

create table public.raw_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id uuid references public.events(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.probability_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  probability numeric(5,2) not null check (probability >= 0 and probability <= 100),
  confidence numeric(5,2) not null check (confidence >= 0 and confidence <= 100),
  source_count integer not null default 0,
  data_freshness_minutes integer not null default 0,
  explanation text not null,
  risk_notes text not null,
  created_at timestamptz not null default now()
);

create table public.event_resolution_rules (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  category event_category not null,
  provider text not null,
  rule jsonb not null,
  conflict_policy text not null default 'needs_review',
  created_at timestamptz not null default now()
);

create table public.market_price_bars (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  time timestamptz not null,
  probability numeric(5,2) not null,
  volume numeric(14,2) not null default 0
);

create table public.paper_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cash numeric(14,2) not null default 10000.00,
  starting_cash numeric(14,2) not null default 10000.00,
  created_at timestamptz not null default now()
);

create table public.paper_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id),
  action order_action not null,
  side trade_side not null,
  quantity numeric(14,4) not null check (quantity > 0),
  status text not null default 'filled' check (status in ('filled', 'rejected', 'cancelled')),
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table public.paper_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.paper_orders(id) on delete set null,
  event_id uuid not null references public.events(id),
  action order_action not null,
  side trade_side not null,
  quantity numeric(14,4) not null check (quantity > 0),
  price numeric(8,4) not null check (price >= 0 and price <= 1),
  notional numeric(14,2) not null,
  realized_pnl numeric(14,2),
  note text not null,
  created_at timestamptz not null default now()
);

create table public.paper_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id),
  side trade_side not null,
  quantity numeric(14,4) not null check (quantity >= 0),
  avg_price numeric(8,4) not null check (avg_price >= 0 and avg_price <= 1),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id, side)
);

create table public.paper_settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id),
  position_id uuid references public.paper_positions(id) on delete set null,
  outcome trade_side not null,
  payout numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null,
  event_category text not null default 'all',
  rule text not null,
  created_at timestamptz not null default now()
);

create table public.backtests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  config jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table public.model_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  prompt text not null,
  answer text not null,
  confidence numeric(5,2) not null,
  created_at timestamptz not null default now()
);

create table public.model_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_run_id uuid not null references public.model_runs(id) on delete cascade,
  helpful boolean not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  points integer not null,
  created_at timestamptz not null default now()
);

create table public.leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  period text not null,
  rank integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric(8,2) not null,
  paper_return_pct numeric(8,2) not null,
  trade_count integer not null,
  created_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  condition alert_condition not null,
  probability numeric(5,2) not null check (probability >= 0 and probability <= 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text,
  created_at timestamptz not null default now()
);

create table public.onboarding_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  complete boolean not null default false,
  completed_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_sources enable row level security;
alter table public.raw_source_snapshots enable row level security;
alter table public.probability_snapshots enable row level security;
alter table public.event_resolution_rules enable row level security;
alter table public.market_price_bars enable row level security;
alter table public.paper_accounts enable row level security;
alter table public.paper_orders enable row level security;
alter table public.paper_trades enable row level security;
alter table public.paper_positions enable row level security;
alter table public.paper_settlements enable row level security;
alter table public.strategies enable row level security;
alter table public.backtests enable row level security;
alter table public.model_runs enable row level security;
alter table public.model_feedback enable row level security;
alter table public.reward_events enable row level security;
alter table public.leaderboard_snapshots enable row level security;
alter table public.alerts enable row level security;
alter table public.waitlist enable row level security;
alter table public.onboarding_state enable row level security;
alter table public.notifications enable row level security;

create policy "public read events" on public.events for select using (true);
create policy "public read event sources" on public.event_sources for select using (true);
create policy "public read probability snapshots" on public.probability_snapshots for select using (true);
create policy "public read market bars" on public.market_price_bars for select using (true);
create policy "public read leaderboard" on public.leaderboard_snapshots for select using (true);
create policy "public insert waitlist" on public.waitlist for insert with check (true);

create policy "users own profiles" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own paper accounts" on public.paper_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own paper orders" on public.paper_orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own paper trades" on public.paper_trades for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own paper positions" on public.paper_positions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own paper settlements" on public.paper_settlements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own strategies" on public.strategies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own backtests" on public.backtests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own model runs" on public.model_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own model feedback" on public.model_feedback for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own rewards" on public.reward_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own alerts" on public.alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own onboarding" on public.onboarding_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own notifications" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No client policies are created for raw_source_snapshots or event_resolution_rules.
-- Use service role only for ingestion, resolution, and admin mutation.

create index idx_events_category_status on public.events(category, status);
create index idx_probability_event_time on public.probability_snapshots(event_id, created_at desc);
create index idx_bars_event_time on public.market_price_bars(event_id, time desc);
create index idx_positions_user on public.paper_positions(user_id);
create index idx_trades_user_time on public.paper_trades(user_id, created_at desc);
create index idx_rewards_user_time on public.reward_events(user_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Andromeda User'))
  on conflict (user_id) do nothing;

  insert into public.paper_accounts(user_id, cash, starting_cash)
  values (new.id, 10000.00, 10000.00)
  on conflict (user_id) do nothing;

  insert into public.reward_events(user_id, event_type, points)
  values (new.id, 'account_created', 50)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
