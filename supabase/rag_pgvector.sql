-- EcoCart RAG: semantic product search using pgvector + Gemini embeddings.
-- Run this in Supabase SQL Editor after schema.sql and impact_upgrade.sql.

create extension if not exists vector;

alter table public.products
add column if not exists embedding vector(768);

create index if not exists products_embedding_cosine_idx
on public.products
using ivfflat (embedding vector_cosine_ops)
with (lists = 10);

create or replace function public.match_products(
  query_embedding vector(768),
  match_count integer default 5
)
returns table (
  id uuid,
  name text,
  category text,
  price_inr integer,
  eco_grade text,
  carbon_saved_kg numeric,
  material text,
  packaging text,
  certification text,
  origin_country text,
  icon text,
  accent_color text,
  description text,
  eco_dimensions jsonb,
  ai_explanation text,
  similarity real
)
language sql
stable
as $$
  select
    p.id,
    p.name,
    p.category,
    p.price_inr,
    p.eco_grade,
    p.carbon_saved_kg,
    p.material,
    p.packaging,
    p.certification,
    p.origin_country,
    p.icon,
    p.accent_color,
    p.description,
    p.eco_dimensions,
    p.ai_explanation,
    (1 - (p.embedding <=> query_embedding))::real as similarity
  from public.products p
  where p.is_active = true
    and p.embedding is not null
  order by p.embedding <=> query_embedding
  limit match_count;
$$;
