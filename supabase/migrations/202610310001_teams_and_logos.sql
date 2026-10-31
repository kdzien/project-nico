-- A stable team identity and one small cached crest per provider/participant ID.
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'meczyki',
  external_id bigint not null check (external_id > 0),
  name text not null,
  slug text,
  country text,
  logo_source_url text,
  logo_data bytea,
  logo_hash text,
  logo_checked_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint teams_provider_external_id_key unique (provider, external_id),
  constraint teams_logo_size check (logo_data is null or octet_length(logo_data) between 12 and 65536),
  constraint teams_logo_pair check ((logo_data is null) = (logo_hash is null))
);
create trigger teams_set_updated_at before update on public.teams
for each row execute function public.set_updated_at();
alter table public.teams enable row level security;
revoke all on public.teams from anon, authenticated;
grant select on public.teams to authenticated;
grant all on public.teams to service_role;
create policy "Authenticated users can read teams" on public.teams
for select to authenticated using (true);

alter table public.events
  add column home_team_id uuid references public.teams(id) on delete restrict,
  add column away_team_id uuid references public.teams(id) on delete restrict;
create index events_home_team_kickoff_idx on public.events(home_team_id, kickoff);
create index events_away_team_kickoff_idx on public.events(away_team_id, kickoff);

-- Reuse participant IDs already present in saved JSON; never match teams by name.
with participants as (
  select provider, statistics->'home' as team, imported_at from public.events
  union all
  select provider, statistics->'away' as team, imported_at from public.events
), normalized as (
  select provider, (team->>'participant_id')::bigint as external_id,
    team->>'name' as name, imported_at
  from participants where team->>'participant_id' ~ '^[0-9]{1,15}$'
    and nullif(team->>'name', '') is not null
)
insert into public.teams(provider, external_id, name)
select distinct on (provider, external_id) provider, external_id, name
from normalized where external_id > 0
order by provider, external_id, imported_at desc;

update public.events e set home_team_id = t.id from public.teams t
where t.provider = e.provider and t.external_id::text = e.statistics#>>'{home,participant_id}';
update public.events e set away_team_id = t.id from public.teams t
where t.provider = e.provider and t.external_id::text = e.statistics#>>'{away,participant_id}';
