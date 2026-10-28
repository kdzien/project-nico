-- Explicitly clearing a coupon resets all its items, including started selections.
create function public.clear_coupon(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Wymagane logowanie'; end if;
  perform 1 from public.coupons where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'Nie znaleziono kuponu'; end if;
  delete from public.coupon_items where coupon_id = p_id;
  update public.coupons set status = 'draft', combined_odds = 1, settled_at = null where id = p_id;
end;
$$;
revoke all on function public.clear_coupon(uuid) from public, anon;
grant execute on function public.clear_coupon(uuid) to authenticated;
