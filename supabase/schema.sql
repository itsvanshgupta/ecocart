-- EcoCart: database schema and starter product catalog
-- Run this file in Supabase Dashboard → SQL Editor → New query.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  eco_score integer not null default 0 check (eco_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for users created before this trigger was installed.
insert into public.profiles (id, full_name, phone)
select id, coalesce(raw_user_meta_data ->> 'full_name', ''), raw_user_meta_data ->> 'phone'
from auth.users
on conflict (id) do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  price_inr integer not null check (price_inr >= 0),
  eco_grade text not null check (eco_grade in ('A', 'B', 'C', 'D', 'E', 'F')),
  carbon_saved_kg numeric(6,2) not null default 0 check (carbon_saved_kg >= 0),
  material text not null,
  packaging text not null,
  certification text,
  origin_country text,
  icon text not null default '◉',
  accent_color text not null default '#adcfa1',
  description text not null,
  eco_dimensions jsonb not null default '{"materials":"B","packaging":"B","carbon":"B","ethics":"B","durability":"B"}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.carbon_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  co2_saved_kg numeric(8,2) not null check (co2_saved_kg >= 0),
  purchase_amount_inr integer check (purchase_amount_inr >= 0),
  packaging_choice text,
  created_at timestamptz not null default now()
);

create table if not exists public.group_buys (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  target_members integer not null check (target_members > 0),
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  closes_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.group_buy_members (
  group_buy_id uuid not null references public.group_buys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_buy_id, user_id)
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text not null,
  icon text not null default '✦'
);

create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.carbon_log enable row level security;
alter table public.group_buys enable row level security;
alter table public.group_buy_members enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
drop policy if exists "Authenticated users read products" on public.products;
create policy "Authenticated users read products" on public.products for select to authenticated using (is_active = true);
drop policy if exists "Users read own carbon log" on public.carbon_log;
create policy "Users read own carbon log" on public.carbon_log for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users add own carbon log" on public.carbon_log;
create policy "Users add own carbon log" on public.carbon_log for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Authenticated users read groups" on public.group_buys;
create policy "Authenticated users read groups" on public.group_buys for select to authenticated using (is_active = true);
drop policy if exists "Authenticated users read group members" on public.group_buy_members;
create policy "Authenticated users read group members" on public.group_buy_members for select to authenticated using (true);
drop policy if exists "Users join groups" on public.group_buy_members;
create policy "Users join groups" on public.group_buy_members for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Authenticated users read badges" on public.badges;
create policy "Authenticated users read badges" on public.badges for select to authenticated using (true);
drop policy if exists "Users read own badges" on public.user_badges;
create policy "Users read own badges" on public.user_badges for select to authenticated using (auth.uid() = user_id);

insert into public.products (slug, name, category, price_inr, eco_grade, carbon_saved_kg, material, packaging, certification, origin_country, icon, accent_color, description, eco_dimensions)
values
  ('cloud-cotton-towels', 'Cloud Cotton Towels', 'Home', 1290, 'A', 1.20, 'GOTS organic cotton', 'Plastic-free paper wrap', 'GOTS', 'India', '▧', '#adcfa1', 'Organic, GOTS-certified cotton and plastic-free delivery.', '{"materials":"A","packaging":"A","carbon":"A","ethics":"A","durability":"A"}'),
  ('refillable-hand-wash', 'Refillable Hand Wash', 'Beauty', 440, 'A', 0.60, 'Plant-based formula', 'Reusable bottle and refill pouch', 'Cruelty Free', 'India', '◒', '#d6bd91', 'A forever bottle with low-water refill pouches.', '{"materials":"A","packaging":"A","carbon":"A","ethics":"B","durability":"A"}'),
  ('bamboo-everyday-tee', 'Bamboo Everyday Tee', 'Beauty', 1690, 'B', 2.80, 'Bamboo viscose blend', 'Recycled paper mailer', 'OEKO-TEX', 'India', '♧', '#95b99c', 'Soft bamboo fibre, responsibly dyed, made to last.', '{"materials":"B","packaging":"A","carbon":"A","ethics":"B","durability":"B"}'),
  ('compostable-coffee-pods', 'Compostable Coffee Pods', 'Food', 590, 'A', 0.90, 'Coffee and plant fibre', 'Home-compostable pod', 'Fairtrade', 'India', '◉', '#ccad72', 'Rich coffee in a home-compostable plant-fibre pod.', '{"materials":"A","packaging":"A","carbon":"A","ethics":"A","durability":"B"}'),
  ('cork-yoga-block', 'Cork Yoga Block', 'Home', 890, 'A', 1.50, 'Renewable natural cork', 'No-plastic wrap', 'FSC', 'Portugal', '▰', '#b89a67', 'Naturally renewable cork, with no synthetic foam.', '{"materials":"A","packaging":"A","carbon":"A","ethics":"B","durability":"A"}'),
  ('botanical-dish-bar', 'Botanical Dish Bar', 'Home', 260, 'B', 0.40, 'Plant-based surfactants', 'Recyclable paper box', 'Leaping Bunny', 'India', '▣', '#b6d7a5', 'Concentrated cleaning power without a single-use bottle.', '{"materials":"A","packaging":"B","carbon":"B","ethics":"A","durability":"B"}'),
  ('oat-milk-chocolate', 'Oat Milk Chocolate', 'Food', 320, 'B', 0.70, 'Fair-trade cocoa and oats', 'Recyclable paper wrapper', 'Fairtrade', 'India', '▤', '#9c7357', 'Fair-trade cocoa wrapped in recyclable paper.', '{"materials":"B","packaging":"A","carbon":"B","ethics":"A","durability":"B"}'),
  ('mineral-sunscreen', 'Mineral Sunscreen', 'Beauty', 760, 'A', 0.80, 'Reef-safe zinc oxide', 'Aluminium tube', 'Cruelty Free', 'India', '◐', '#dfc5a6', 'Reef-safe mineral protection in an aluminium tube.', '{"materials":"A","packaging":"A","carbon":"A","ethics":"A","durability":"B"}')
on conflict (slug) do update set
  name = excluded.name, category = excluded.category, price_inr = excluded.price_inr, eco_grade = excluded.eco_grade,
  carbon_saved_kg = excluded.carbon_saved_kg, material = excluded.material, packaging = excluded.packaging,
  certification = excluded.certification, origin_country = excluded.origin_country, icon = excluded.icon,
  accent_color = excluded.accent_color, description = excluded.description, eco_dimensions = excluded.eco_dimensions;

insert into public.badges (code, name, description, icon)
values
  ('carbon-champion', 'Carbon Champion', 'Saved 10kg of CO₂ through conscious purchases.', '✦'),
  ('plastic-free-week', 'Plastic-Free Week', 'Chose low-waste alternatives for seven days.', '⌁')
on conflict (code) do nothing;
