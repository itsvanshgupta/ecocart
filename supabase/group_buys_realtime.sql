-- Enable live Group Buy membership updates for Supabase Realtime.
-- Safe to run more than once.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_buy_members'
  ) then
    alter publication supabase_realtime add table public.group_buy_members;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_buys'
  ) then
    alter publication supabase_realtime add table public.group_buys;
  end if;
end;
$$;
