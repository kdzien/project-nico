create extension if not exists pgcrypto;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'meczyki',
  external_id bigint not null,
  kickoff timestamptz not null,
  competition text not null,
  round text,
  home_team text not null,
  away_team text not null,
  status text not null default 'scheduled',
  home_score integer,
  away_score integer,
  odds jsonb not null default '{}'::jsonb,
  statistics jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settled_at timestamptz,
  constraint events_provider_external_id_key unique (provider, external_id),
  constraint events_home_score_nonnegative check (home_score is null or home_score >= 0),
  constraint events_away_score_nonnegative check (away_score is null or away_score >= 0)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  stake numeric(12, 2),
  combined_odds numeric(14, 4) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settled_at timestamptz,
  constraint coupons_status_check check (status in ('draft', 'placed', 'won', 'lost', 'partially_won', 'void')),
  constraint coupons_stake_nonnegative check (stake is null or stake >= 0),
  constraint coupons_combined_odds_positive check (combined_odds > 0)
);

create table public.coupon_items (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete restrict,
  selection text not null,
  odds_at_add numeric(10, 2) not null,
  result text not null default 'pending',
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  constraint coupon_items_selection_check check (selection in ('1', 'X', '2', '1X', '2X')),
  constraint coupon_items_result_check check (result in ('pending', 'won', 'lost', 'void')),
  constraint coupon_items_odds_positive check (odds_at_add > 0),
  constraint coupon_items_coupon_event_key unique (coupon_id, event_id)
);

create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'events',
  target_date date not null,
  status text not null default 'running',
  events_found integer not null default 0,
  events_saved integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint import_runs_kind_check check (kind in ('events', 'results')),
  constraint import_runs_status_check check (status in ('running', 'succeeded', 'failed')),
  constraint import_runs_counts_nonnegative check (events_found >= 0 and events_saved >= 0)
);

create index events_kickoff_idx on public.events(kickoff);
create index events_status_kickoff_idx on public.events(status, kickoff);
create index events_competition_idx on public.events(competition);
create index coupons_user_created_at_idx on public.coupons(user_id, created_at desc);
create index coupon_items_coupon_id_idx on public.coupon_items(coupon_id);
create index coupon_items_event_id_idx on public.coupon_items(event_id);
create index import_runs_target_date_idx on public.import_runs(target_date desc, started_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger coupons_set_updated_at
before update on public.coupons
for each row execute function public.set_updated_at();

alter table public.events enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_items enable row level security;
alter table public.import_runs enable row level security;

revoke all on table public.events from anon, authenticated;
revoke all on table public.coupons from anon, authenticated;
revoke all on table public.coupon_items from anon, authenticated;
revoke all on table public.import_runs from anon, authenticated;

grant select on table public.events to authenticated;
grant select, insert, update, delete on table public.coupons to authenticated;
grant select, insert, update, delete on table public.coupon_items to authenticated;
grant select on table public.import_runs to authenticated;

create policy "Authenticated users can read events"
on public.events for select
to authenticated
using (true);

create policy "Users can read their coupons"
on public.coupons for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their coupons"
on public.coupons for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their coupons"
on public.coupons for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their coupons"
on public.coupons for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read items from their coupons"
on public.coupon_items for select
to authenticated
using (
  exists (
    select 1 from public.coupons
    where coupons.id = coupon_items.coupon_id
      and coupons.user_id = (select auth.uid())
  )
);

create policy "Users can add items to their coupons"
on public.coupon_items for insert
to authenticated
with check (
  exists (
    select 1 from public.coupons
    where coupons.id = coupon_items.coupon_id
      and coupons.user_id = (select auth.uid())
  )
);

create policy "Users can update items in their coupons"
on public.coupon_items for update
to authenticated
using (
  exists (
    select 1 from public.coupons
    where coupons.id = coupon_items.coupon_id
      and coupons.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.coupons
    where coupons.id = coupon_items.coupon_id
      and coupons.user_id = (select auth.uid())
  )
);

create policy "Users can delete items from their coupons"
on public.coupon_items for delete
to authenticated
using (
  exists (
    select 1 from public.coupons
    where coupons.id = coupon_items.coupon_id
      and coupons.user_id = (select auth.uid())
  )
);

create policy "Authenticated users can read import runs"
on public.import_runs for select
to authenticated
using (true);
