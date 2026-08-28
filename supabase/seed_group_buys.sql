-- Seed active group buys — run this in Supabase SQL Editor
-- Correct column names: title, target_members, discount_percent

insert into public.group_buys (product_id, title, target_members, discount_percent, is_active)
select id, 'Cloud Cotton Towels Circle', 20, 15, true
from public.products where name = 'Cloud Cotton Towels'
on conflict do nothing;

insert into public.group_buys (product_id, title, target_members, discount_percent, is_active)
select id, 'Cork Yoga Block Circle', 15, 10, true
from public.products where name = 'Cork Yoga Block'
on conflict do nothing;

insert into public.group_buys (product_id, title, target_members, discount_percent, is_active)
select id, 'Compostable Coffee Pods Circle', 25, 12, true
from public.products where name = 'Compostable Coffee Pods'
on conflict do nothing;
