-- Re-importing descriptive data must never undo a recorded settlement.
create function public.preserve_settled_event() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.settled_at is not null then
    new.status := old.status;
    new.home_score := old.home_score;
    new.away_score := old.away_score;
    new.settled_at := old.settled_at;
  end if;
  return new;
end;
$$;
create trigger events_preserve_settlement before update on public.events
for each row execute function public.preserve_settled_event();

create function public.settle_event(
  p_event_id uuid, p_status text, p_home integer, p_away integer, p_kickoff timestamptz
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
  v_coupon uuid;
  v_item record;
  v_pending integer;
  v_lost integer;
  v_won integer;
  v_combined numeric;
  v_terminal boolean;
begin
  if p_status is null or p_status not in ('scheduled','live','finished','cancelled','postponed','unknown') then raise exception 'Niepoprawny status'; end if;
  if p_home < 0 or p_away < 0 then raise exception 'Niepoprawny wynik'; end if;
  -- Same order as the editor: coupons first, then events. Repeated jobs serialize.
  perform 1 from public.coupons c where exists (
    select 1 from public.coupon_items i where i.coupon_id = c.id and i.event_id = p_event_id
  ) order by c.id for update;
  select * into v_event from public.events where id = p_event_id for update;
  if not found then raise exception 'Nie znaleziono wydarzenia'; end if;
  if v_event.settled_at is not null then return false; end if;
  v_terminal := p_status = 'cancelled' or (p_status = 'finished' and p_home is not null and p_away is not null);
  update public.events set status = p_status, kickoff = coalesce(p_kickoff, kickoff),
    home_score = case when p_status = 'finished' then p_home else null end,
    away_score = case when p_status = 'finished' then p_away else null end,
    settled_at = case when v_terminal then now() else null end where id = p_event_id;
  if not v_terminal then return false; end if;

  update public.coupon_items i set result = case
    when p_status = 'cancelled' then 'void'
    when (i.selection = '1' and p_home > p_away)
      or (i.selection = 'X' and p_home = p_away)
      or (i.selection = '2' and p_home < p_away)
      or (i.selection = '1X' and p_home >= p_away)
      or (i.selection = '2X' and p_home <= p_away) then 'won'
    else 'lost' end, settled_at = now()
  where i.event_id = p_event_id and i.result = 'pending'
    and exists (select 1 from public.coupons c where c.id = i.coupon_id and c.status <> 'draft');

  for v_coupon in select distinct i.coupon_id from public.coupon_items i join public.coupons c on c.id = i.coupon_id
    where i.event_id = p_event_id and c.status <> 'draft' order by i.coupon_id loop
    v_pending := 0; v_lost := 0; v_won := 0; v_combined := 1;
    for v_item in select result, odds_at_add from public.coupon_items where coupon_id = v_coupon loop
      if v_item.result = 'pending' then v_pending := v_pending + 1; end if;
      if v_item.result = 'lost' then v_lost := v_lost + 1; end if;
      if v_item.result = 'won' then v_won := v_won + 1; end if;
      if v_item.result <> 'void' then v_combined := v_combined * v_item.odds_at_add; end if;
    end loop;
    update public.coupons set status = case
      when v_lost > 0 then 'lost' when v_pending > 0 then 'placed' when v_won > 0 then 'won' else 'void' end,
      combined_odds = round(v_combined, 4), settled_at = case when v_pending = 0 then now() else null end
      where id = v_coupon;
  end loop;
  return true;
end;
$$;
revoke all on function public.settle_event(uuid,text,integer,integer,timestamptz) from public, anon, authenticated;
grant execute on function public.settle_event(uuid,text,integer,integer,timestamptz) to service_role;
