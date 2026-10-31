alter table public.events
  add column live_home_score integer check (live_home_score is null or live_home_score >= 0),
  add column live_away_score integer check (live_away_score is null or live_away_score >= 0),
  add column match_minute text,
  add column match_phase text,
  add column result_checked_at timestamptz;

create function public.record_match_result(
  p_event_id uuid, p_status text, p_home integer, p_away integer, p_kickoff timestamptz,
  p_live_home integer, p_live_away integer, p_minute text, p_phase text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
  v_terminal boolean;
begin
  if p_status is null or p_status not in ('scheduled','live','finished','cancelled','postponed','unknown') then raise exception 'Niepoprawny status'; end if;
  if p_home < 0 or p_away < 0 or p_live_home < 0 or p_live_away < 0 then raise exception 'Niepoprawny wynik'; end if;
  if p_minute is not null and p_minute !~ '^[0-9]{1,3}(\+[0-9]{1,2})?$' then raise exception 'Niepoprawna minuta'; end if;
  select * into v_event from public.events where id = p_event_id for update;
  if not found then raise exception 'Nie znaleziono wydarzenia'; end if;
  if v_event.settled_at is not null then return false; end if;
  v_terminal := p_status = 'cancelled' or (p_status = 'finished' and p_home is not null and p_away is not null);
  update public.events set status = p_status, kickoff = coalesce(p_kickoff, kickoff),
    home_score = case when p_status = 'finished' then p_home else null end,
    away_score = case when p_status = 'finished' then p_away else null end,
    live_home_score = case when p_status in ('live','finished') then p_live_home else null end,
    live_away_score = case when p_status in ('live','finished') then p_live_away else null end,
    match_minute = case when p_status = 'live' then p_minute else null end,
    match_phase = case when p_status = 'live' then p_phase else null end,
    result_checked_at = now(),
    settled_at = case when v_terminal then now() else null end
  where id = p_event_id;
  return v_terminal;
end;
$$;
revoke all on function public.record_match_result(uuid,text,integer,integer,timestamptz,integer,integer,text,text) from public, anon, authenticated;
grant execute on function public.record_match_result(uuid,text,integer,integer,timestamptz,integer,integer,text,text) to service_role;

-- Ordinary descriptive imports must not replace either finalized scores or their live snapshot.
create or replace function public.preserve_settled_event() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.settled_at is not null then
    new.status := old.status;
    new.home_score := old.home_score;
    new.away_score := old.away_score;
    new.settled_at := old.settled_at;
    new.live_home_score := old.live_home_score;
    new.live_away_score := old.live_away_score;
    new.match_minute := old.match_minute;
    new.match_phase := old.match_phase;
    new.result_checked_at := old.result_checked_at;
  end if;
  return new;
end;
$$;
