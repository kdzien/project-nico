-- Autosaved coupons are tracked immediately. Keep the legacy RPC signature compatible.
create or replace function public.save_coupon(
  p_id uuid, p_name text, p_stake numeric, p_items jsonb, p_finalize boolean default false
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_status text;
  v_item jsonb;
  v_existing public.coupon_items;
  v_event public.events;
  v_odds numeric;
  v_combined numeric := 1;
begin
  if v_user is null then raise exception 'Wymagane logowanie'; end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 120 then raise exception 'Niepoprawna nazwa'; end if;
  if p_stake is not null and (p_stake < 0 or p_stake > 9999999999.99 or p_stake::text = 'NaN') then raise exception 'Niepoprawna stawka'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Niepoprawne pozycje'; end if;
  if jsonb_array_length(p_items) not between 0 and 100 then raise exception 'Kupon wymaga 0–100 pozycji'; end if;
  if (select count(distinct x->>'event_id') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items) then
    raise exception 'Tylko jeden wybór na wydarzenie';
  end if;
  if p_id is null then
    insert into public.coupons(user_id, name, stake) values (v_user, btrim(p_name), p_stake) returning id into v_id;
  else
    select status into v_status from public.coupons where id = p_id and user_id = v_user for update;
    if not found or v_status not in ('draft', 'placed') then raise exception 'Brak edytowalnego kuponu'; end if;
    v_id := p_id;
  end if;
  -- Stable event lock order prevents conflicting editors/settlement from deadlocking.
  perform 1 from public.events where id in (select (x->>'event_id')::uuid from jsonb_array_elements(p_items) x) order by id for share;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if v_item->>'selection' is null or v_item->>'selection' not in ('1','X','2','1X','2X') then raise exception 'Niepoprawny typ'; end if;
    select * into v_event from public.events where id = (v_item->>'event_id')::uuid;
    if not found then raise exception 'Nie znaleziono wydarzenia'; end if;
    select * into v_existing from public.coupon_items where coupon_id = v_id and event_id = v_event.id;
    if v_existing.id is null or v_existing.selection <> v_item->>'selection' then
      if v_event.status <> 'scheduled' or v_event.kickoff <= now() then raise exception 'Wydarzenie już się rozpoczęło lub jest niedostępne'; end if;
    end if;
    if v_existing.id is not null and v_existing.selection = v_item->>'selection' then
      v_odds := v_existing.odds_at_add;
    else
      -- The displayed quote is frozen when the user adds a selection.
      v_odds := (v_item->>'odds_at_add')::numeric;
    end if;
    if v_odds is null or v_odds::text in ('NaN','Infinity','-Infinity') or v_odds <= 0 or v_odds > 99999999.99 then raise exception 'Niepoprawny kurs'; end if;
    v_odds := round(v_odds, 2);
    insert into public.coupon_items(coupon_id, event_id, selection, odds_at_add)
    values (v_id, v_event.id, v_item->>'selection', v_odds)
    on conflict (coupon_id, event_id) do update set selection = excluded.selection, odds_at_add = excluded.odds_at_add;
    v_combined := v_combined * v_odds;
  end loop;
  -- Started selections cannot be removed, even by a stale or manipulated client.
  if exists (
    select 1 from public.coupon_items i join public.events e on e.id = i.event_id
    where i.coupon_id = v_id and (e.status <> 'scheduled' or e.kickoff <= now())
      and not exists (select 1 from jsonb_array_elements(p_items) x where (x->>'event_id')::uuid = i.event_id)
  ) then raise exception 'Rozpoczętej pozycji nie można usunąć'; end if;
  delete from public.coupon_items where coupon_id = v_id and event_id not in (select (x->>'event_id')::uuid from jsonb_array_elements(p_items) x);
  select coalesce(exp(sum(ln(odds_at_add)) filter (where result <> 'void')), 1)
    into v_combined from public.coupon_items where coupon_id = v_id;
  if v_combined >= 10000000000 then raise exception 'Zbyt duży kurs łączny'; end if;
  update public.coupons set name = btrim(p_name), stake = p_stake, combined_odds = round(v_combined, 4),
    status = case
      when jsonb_array_length(p_items) = 0 then 'draft'
      when exists (select 1 from public.coupon_items where coupon_id = v_id and result = 'lost') then 'lost'
      when exists (select 1 from public.coupon_items where coupon_id = v_id and result = 'pending') then 'placed'
      when exists (select 1 from public.coupon_items where coupon_id = v_id and result = 'won') then 'won'
      else 'void' end
    where id = v_id;
  return v_id;
end;
$$;
revoke all on function public.save_coupon(uuid,text,numeric,jsonb,boolean) from public, anon;
grant execute on function public.save_coupon(uuid,text,numeric,jsonb,boolean) to authenticated;

-- Existing drafts keep their IDs and quotes, and join automatic settlement.
update public.coupon_items i set result = case
  when e.status = 'cancelled' then 'void'
  when (i.selection = '1' and e.home_score > e.away_score)
    or (i.selection = 'X' and e.home_score = e.away_score)
    or (i.selection = '2' and e.home_score < e.away_score)
    or (i.selection = '1X' and e.home_score >= e.away_score)
    or (i.selection = '2X' and e.home_score <= e.away_score) then 'won'
  else 'lost' end, settled_at = now()
from public.events e, public.coupons c
where i.event_id = e.id and i.coupon_id = c.id and c.status in ('draft', 'placed')
  and i.result = 'pending' and (e.status = 'cancelled'
    or (e.status = 'finished' and e.home_score is not null and e.away_score is not null));

with totals as (
  select c.id, count(i.id) as items,
    count(*) filter (where i.result = 'pending') as pending,
    count(*) filter (where i.result = 'lost') as lost,
    count(*) filter (where i.result = 'won') as won,
    coalesce(exp(sum(ln(i.odds_at_add)) filter (where i.result <> 'void')), 1) as combined
  from public.coupons c left join public.coupon_items i on i.coupon_id = c.id
  where c.status in ('draft', 'placed') group by c.id
)
update public.coupons c set
  status = case when t.items = 0 then 'draft' when t.lost > 0 then 'lost'
    when t.pending > 0 then 'placed' when t.won > 0 then 'won' else 'void' end,
  combined_odds = round(t.combined, 4),
  settled_at = case when t.items > 0 and t.pending = 0 then now() else null end
from totals t where c.id = t.id;
