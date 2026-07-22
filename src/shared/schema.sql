-- ============================================================
-- BasaQuest SHARED database schema (Supabase / Postgres)
-- Bring this to the team meeting. The `pupils` table is shared by
-- all three modules; the history_* tables are owned by the History
-- module but MUST reference the shared pupils.id.
-- ============================================================

-- Shared identity — owned by no single module, used by all.
create table if not exists pupils (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null,          -- never leaves the app / never sent to cloud
  grade_level  int  not null check (grade_level between 1 and 6),
  section      text,
  created_at   timestamptz not null default now()
);

-- ---------- History module tables (owned by Lee) ----------

-- One row per arc playthrough.
create table if not exists history_sessions (
  id                    uuid primary key default gen_random_uuid(),
  pupil_id              uuid not null references pupils(id) on delete cascade,
  arc                   text not null check (arc in ('mactan','pugad_lawin','datu_bago')),
  started_at            timestamptz not null default now(),
  finished_at           timestamptz,
  pre_assessment_score  real,          -- 0..1
  post_assessment_score real,          -- 0..1
  learner_label         text check (learner_label in ('surface','deep')),
  learner_confidence    real           -- 0..1
);

-- Raw behavioral events — the training data for the classifier.
create table if not exists history_behavior_logs (
  id         bigint generated always as identity primary key,
  session_id uuid not null references history_sessions(id) on delete cascade,
  pupil_id   uuid not null references pupils(id) on delete cascade,
  arc        text not null,
  ts         timestamptz not null,
  type       text not null,
  node_id    text not null,
  payload    jsonb not null default '{}'::jsonb
);

create index if not exists idx_behavior_session on history_behavior_logs(session_id);
create index if not exists idx_sessions_pupil   on history_sessions(pupil_id);

-- NOTE: Row Level Security is intentionally NOT enabled yet.
-- Enable and write policies together with the team once auth is wired,
-- so all three modules share one auth model (see types.ts).
