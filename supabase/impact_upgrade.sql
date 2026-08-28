-- EcoCart impact upgrade: run this once in Supabase SQL Editor.
-- Adds the product metadata and explainable grading fields used by the upgraded frontend.

alter table public.products add column if not exists recycling_code text;
alter table public.products add column if not exists ai_explanation text;

update public.products
set recycling_code = case slug
  when 'cloud-cotton-towels' then 'PAP 22 — widely recyclable paper'
  when 'refillable-hand-wash' then 'HDPE 2 — recyclable bottle'
  when 'bamboo-everyday-tee' then 'TEX 60 — textile take-back preferred'
  when 'compostable-coffee-pods' then 'HOME COMPOST — plant fibre pod'
  when 'cork-yoga-block' then 'CORK — naturally biodegradable'
  when 'botanical-dish-bar' then 'PAP 21 — recyclable card'
  when 'oat-milk-chocolate' then 'PAP 22 — recyclable paper'
  when 'mineral-sunscreen' then 'ALU 41 — recyclable aluminium'
end,
ai_explanation = case slug
  when 'cloud-cotton-towels' then 'Grade A: GOTS organic cotton avoids conventional pesticide intensity, while plastic-free delivery keeps packaging impact low. Built for years of repeated use.'
  when 'refillable-hand-wash' then 'Grade A: The durable bottle removes repeat single-use packaging and compact refills reduce transport emissions. The formula is plant based and cruelty free.'
  when 'bamboo-everyday-tee' then 'Grade B: Bamboo is a lower-impact fibre than many conventional options, but blended fabric can make end-of-life recycling harder. Strong carbon and packaging performance.'
  when 'compostable-coffee-pods' then 'Grade A: Plant-fibre pods are designed to break down at home, avoiding the aluminium or plastic waste associated with conventional single-serve coffee.'
  when 'cork-yoga-block' then 'Grade A: Cork regenerates naturally after harvesting and the block replaces synthetic foam with a long-lived, biodegradable material.'
  when 'botanical-dish-bar' then 'Grade B: A water-light solid format avoids a plastic bottle and lowers shipping weight, with recyclable cardboard packaging.'
  when 'oat-milk-chocolate' then 'Grade B: Fair-trade cocoa supports better producer standards and paper packaging reduces plastic, while food-supply-chain emissions keep the overall grade below A.'
  when 'mineral-sunscreen' then 'Grade A: Reef-safe mineral protection, aluminium packaging, and a cruelty-free formula create a strong all-round sustainability profile.'
end;

insert into public.group_buys (product_id, title, target_members, discount_percent, closes_at)
select id, 'Refill together: Refillable Hand Wash', 50, 18, now() + interval '7 days'
from public.products where slug = 'refillable-hand-wash'
and not exists (select 1 from public.group_buys where title = 'Refill together: Refillable Hand Wash');

insert into public.group_buys (product_id, title, target_members, discount_percent, closes_at)
select id, 'Plastic-free coffee circle', 25, 12, now() + interval '5 days'
from public.products where slug = 'compostable-coffee-pods'
and not exists (select 1 from public.group_buys where title = 'Plastic-free coffee circle');
