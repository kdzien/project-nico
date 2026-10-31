alter table public.events
  add column competition_id bigint,
  add column competition_slug text,
  add column competition_type text,
  add column competition_level integer,
  add column competition_display_order integer,
  add column country_id bigint,
  add column country text,
  add column country_slug text,
  add constraint events_competition_level_positive check (competition_level is null or competition_level > 0);
