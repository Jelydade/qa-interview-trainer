-- Schema for cross-device spaced-repetition progress.
-- Apply this only to the qa-interview-trainer Supabase project.

create table public.learning_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null,
  next_review_at date not null,
  interval_days integer not null check (interval_days >= 1),
  repetitions integer not null default 0 check (repetitions >= 0),
  last_rating text not null check (last_rating in ('again', 'hard', 'good')),
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, question_key)
);

alter table public.learning_progress enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.learning_progress to authenticated;

create policy "Users manage only their own learning progress"
on public.learning_progress
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
