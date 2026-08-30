-- Exact greener alternatives for EcoCart RAG.
-- Run after schema.sql, impact_upgrade.sql, and rag_pgvector.sql.
-- This migration only adds or updates catalog data; it does not remove products.

alter table public.products
add column if not exists comparison_group text not null default 'general';

update public.products set category = 'Clothing', comparison_group = 't-shirt'
where slug = 'bamboo-everyday-tee';
update public.products set comparison_group = 'towels' where slug = 'cloud-cotton-towels';
update public.products set comparison_group = 'hand-wash' where slug = 'refillable-hand-wash';
update public.products set comparison_group = 'coffee-pods' where slug = 'compostable-coffee-pods';
update public.products set comparison_group = 'yoga-block' where slug = 'cork-yoga-block';
update public.products set comparison_group = 'dish-cleaner' where slug = 'botanical-dish-bar';
update public.products set comparison_group = 'chocolate' where slug = 'oat-milk-chocolate';
update public.products set comparison_group = 'sunscreen' where slug = 'mineral-sunscreen';

-- Keep the original prototype seed records in the database, but remove them
-- from the active customer catalog because they have no curated comparison
-- group in this version of EcoCart.
update public.products
set is_active = false
where name in (
  'Bamboo Toothbrush', 'Organic Cotton Tote Bag', 'Reusable Beeswax Wraps',
  'Stainless Steel Water Bottle', 'Organic Cotton T-Shirt', 'Bamboo Cutting Board',
  'Natural Loofah Sponge', 'Solar Phone Charger', 'Hemp Seed Oil Moisturiser',
  'Recycled Plastic Backpack'
);

-- Each B-grade product gets a comparable A-grade alternative.
insert into public.products (
  slug, name, category, price_inr, eco_grade, carbon_saved_kg,
  material, packaging, certification, origin_country, icon, accent_color,
  description, eco_dimensions, is_active, comparison_group
)
values
  ('hemp-everyday-tee', 'Hemp Everyday Tee', 'Clothing', 1890, 'A', 3.40,
   '55% hemp and 45% GOTS organic cotton', 'Recycled paper mailer', 'GOTS, OEKO-TEX', 'India', '♧', '#8eb39b',
   'A durable hemp-organic cotton tee with lower-impact fibres and plastic-free delivery.',
   '{"materials":"A","packaging":"A","carbon":"A","ethics":"A","durability":"A"}', true, 't-shirt'),
  ('refillable-dish-concentrate', 'Refillable Dish Concentrate', 'Home', 390, 'A', 0.90,
   'Plant-based concentrated formula', 'Reusable aluminium bottle and refill tablet', 'Leaping Bunny', 'India', '▣', '#9fc69b',
   'A refillable, ultra-concentrated dish cleaner that avoids repeat plastic bottles.',
   '{"materials":"A","packaging":"A","carbon":"A","ethics":"A","durability":"A"}', true, 'dish-cleaner'),
  ('organic-dark-chocolate', 'Organic Dark Chocolate', 'Food', 360, 'A', 1.00,
   'Organic Fairtrade cocoa and oats', 'Compostable cellulose wrapper', 'Fairtrade, Organic', 'India', '▤', '#76533f',
   'Fairtrade organic dark chocolate in a compostable wrapper with transparent cocoa sourcing.',
   '{"materials":"A","packaging":"A","carbon":"A","ethics":"A","durability":"A"}', true, 'chocolate')
on conflict (slug) do update set
  name = excluded.name, category = excluded.category, price_inr = excluded.price_inr,
  eco_grade = excluded.eco_grade, carbon_saved_kg = excluded.carbon_saved_kg,
  material = excluded.material, packaging = excluded.packaging,
  certification = excluded.certification, origin_country = excluded.origin_country,
  icon = excluded.icon, accent_color = excluded.accent_color,
  description = excluded.description, eco_dimensions = excluded.eco_dimensions,
  comparison_group = excluded.comparison_group, is_active = true;

create or replace function public.match_products_in_group(
  query_embedding vector(768), target_group text, match_count integer default 5
)
returns table (
  id uuid, name text, category text, price_inr integer, eco_grade text,
  carbon_saved_kg numeric, material text, packaging text, certification text,
  origin_country text, icon text, accent_color text, description text,
  eco_dimensions jsonb, ai_explanation text, similarity real
)
language sql stable
as $$
  select p.id, p.name, p.category, p.price_inr, p.eco_grade, p.carbon_saved_kg,
         p.material, p.packaging, p.certification, p.origin_country, p.icon,
         p.accent_color, p.description, p.eco_dimensions, p.ai_explanation,
         (1 - (p.embedding <=> query_embedding))::real as similarity
  from public.products p
  where p.is_active = true and p.embedding is not null
    and p.comparison_group = target_group
  order by p.embedding <=> query_embedding
  limit match_count;
$$;
