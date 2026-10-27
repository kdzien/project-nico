-- Mutations use one transaction and explicitly verify the owner. Reads still use RLS.
revoke insert, update on public.coupons from authenticated;
revoke insert, update, delete on public.coupon_items from authenticated;

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
  if jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Kupon wymaga 1–100 pozycji'; end if;
  if (select count(distinct x->>'event_id') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items) then
    raise exception 'Tylko jeden wybór na wydarzenie';
  end if;
  if p_id is null then
    insert into public.coupons(user_id, name, stake) values (v_user, btrim(p_name), p_stake) returning id into v_id;
  else
    select status into v_status from public.coupons where id = p_id and user_id = v_user for update;
    if not found or v_status <> 'draft' then raise exception 'Brak edytowalnego kuponu'; end if;
    v_id := p_id;
  end if;
  -- Stable event lock order prevents conflicting editors/settlement from deadlocking.
  perform 1 from public.events where id in (select (x->>'event_id')::uuid from jsonb_array_elements(p_items) x) order by id for share;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if v_item->>'selection' is null or v_item->>'selection' not in ('1','X','2','1X','2X') then raise exception 'Niepoprawny typ'; end if;
    select * into v_event from public.events where id = (v_item->>'event_id')::uuid;
    if not found then raise exception 'Nie znaleziono wydarzenia'; end if;
    select * into v_existing from public.coupon_items where coupon_id = v_id and event_id = v_event.id;
    if p_finalize or v_existing.id is null or v_existing.selection <> v_item->>'selection' then
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
  delete from public.coupon_items where coupon_id = v_id and event_id not in (select (x->>'event_id')::uuid from jsonb_array_elements(p_items) x);
  update public.coupons set name = btrim(p_name), stake = p_stake, combined_odds = round(v_combined, 4),
    status = case when p_finalize then 'placed' else 'draft' end where id = v_id;
  return v_id;
end;
$$;
revoke all on function public.save_coupon(uuid,text,numeric,jsonb,boolean) from public, anon;
grant execute on function public.save_coupon(uuid,text,numeric,jsonb,boolean) to authenticated;
