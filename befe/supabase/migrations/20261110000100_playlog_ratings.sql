-- PLAYLOG ratings, reviews, favorites, and public game catalog.
create table if not exists public.games (
  id bigint primary key,
  title text not null,
  genre text not null,
  platform text not null,
  year integer not null,
  image text not null,
  description text not null
);

-- Provide an ID for games created through the admin screen.
create sequence if not exists public.games_id_seq;
alter sequence public.games_id_seq owned by public.games.id;
alter table public.games alter column id set default nextval('public.games_id_seq');

-- Game catalog entries are loaded separately from supabase/seed.sql.
create table if not exists public.ratings (
  game_id bigint not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (game_id,user_id)
);

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  game_id bigint not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 32),
  body text not null check (char_length(body) between 2 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists reviews_game_created_idx on public.reviews (game_id,created_at desc);

create table if not exists public.favorites (
  game_id bigint not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id,user_id)
);

alter table public.games enable row level security;
alter table public.ratings enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;

revoke all on public.games,public.ratings,public.reviews,public.favorites from anon,authenticated;
grant select on public.games to anon,authenticated;
grant insert,update,delete on public.games to authenticated;
grant select,insert,update,delete on public.ratings to authenticated;
grant select on public.reviews to authenticated;
grant insert,update,delete on public.reviews to authenticated;
grant select,insert,update,delete on public.favorites to authenticated;
grant usage,select on sequence public.reviews_id_seq to authenticated;
grant usage,select on sequence public.games_id_seq to authenticated;

 drop policy if exists "Anyone can read the game catalog" on public.games;
create policy "Anyone can read the game catalog" on public.games for select to anon,authenticated using (true);

-- Only trusted app_metadata claims grant administrator access. User-editable metadata is not used.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false);
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can add games" on public.games;
create policy "Admins can add games" on public.games for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "Admins can edit games" on public.games;
create policy "Admins can edit games" on public.games for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Admins can remove games" on public.games;
create policy "Admins can remove games" on public.games for delete to authenticated using ((select public.is_admin()));
drop policy if exists "Admins can view all reviews" on public.reviews;
create policy "Admins can view all reviews" on public.reviews for select to authenticated using ((select public.is_admin()));

drop policy if exists "Signed in users can read ratings" on public.ratings;
create policy "Signed in users can read ratings" on public.ratings for select to authenticated using ((select auth.uid()) is not null and (select auth.uid())=user_id);
drop policy if exists "Users can add their own rating" on public.ratings;
create policy "Users can add their own rating" on public.ratings for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "Users can change their own rating" on public.ratings;
create policy "Users can change their own rating" on public.ratings for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Users can remove their own rating" on public.ratings;
create policy "Users can remove their own rating" on public.ratings for delete to authenticated using ((select auth.uid())=user_id);

drop policy if exists "Anyone can read reviews" on public.reviews;
drop policy if exists "Users can read their own reviews" on public.reviews;
create policy "Users can read their own reviews" on public.reviews for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Users can publish their own reviews" on public.reviews;
create policy "Users can publish their own reviews" on public.reviews for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "Users can edit their own reviews" on public.reviews;
create policy "Users can edit their own reviews" on public.reviews for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Users can delete their own reviews" on public.reviews;
create policy "Users can delete their own reviews" on public.reviews for delete to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Admins can moderate reviews" on public.reviews;
create policy "Admins can moderate reviews" on public.reviews for delete to authenticated using ((select public.is_admin()));

 drop policy if exists "Users can read their own favorites" on public.favorites;
create policy "Users can read their own favorites" on public.favorites for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Users can add their own favorites" on public.favorites;
create policy "Users can add their own favorites" on public.favorites for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "Users can update their own favorites" on public.favorites;
create policy "Users can update their own favorites" on public.favorites for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Users can remove their own favorites" on public.favorites;
create policy "Users can remove their own favorites" on public.favorites for delete to authenticated using ((select auth.uid())=user_id);

-- Public aggregate exposes only average and vote count, never user IDs or individual ratings.
create or replace view public.game_rating_summary as
  select game_id,
         round(avg(score)::numeric,1) as average_rating,
         count(*)::integer as vote_count
  from public.ratings
  group by game_id;
revoke all on public.game_rating_summary from anon,authenticated;
grant select on public.game_rating_summary to anon,authenticated;

-- Public review feed exposes display names and review scores without exposing user IDs.
create or replace view public.review_feed as
  select r.id,r.game_id,g.title as game_title,r.body,r.author_name,r.created_at,rt.score
  from public.reviews as r
  join public.games as g on g.id=r.game_id
  left join public.ratings as rt on rt.game_id=r.game_id and rt.user_id=r.user_id;
revoke all on public.review_feed from anon,authenticated;
grant select on public.review_feed to anon,authenticated;
