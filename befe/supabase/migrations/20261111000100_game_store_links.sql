-- Add optional store metadata to catalog entries.
alter table public.games add column if not exists store_name text;
alter table public.games add column if not exists store_url text;
