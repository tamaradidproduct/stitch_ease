-- Applied to project dozzilmrtjhinoactcve (stitch-ease-app) on 2026-08-11.
-- This file is the record of what the schema is; the dashboard is how it got
-- there. Keep them in step by hand — there is no CLI in this project.
--
-- Column shapes follow js/core/storage.js save(), NOT the original plan §A,
-- which predates the app's per-phase chart rows.

create table projects (
  id                  text primary key,        -- CLIENT-generated (newId()); offline creates need no round trip
  owner_id            uuid not null references auth.users(id) on delete cascade,
  name                text not null check (char_length(name) <= 120),
  pattern_id          text not null,
  created_ms          bigint not null,         -- registry `created`
  updated_ms          bigint not null,         -- registry `updatedAt`
  deleted_ms          bigint,                  -- registry `deletedAt`; tombstone, never hard-delete
  pattern_struct_hash text,                    -- Phase 8; null until then
  pattern_doc         jsonb,                   -- Phase 8; null while the code pattern matches
  server_updated_at   timestamptz not null default now()
);

-- One row per project, not per step: mirrors what save() writes in one go, and
-- the clocks map already gives per-field granularity at single-row cost.
create table project_progress (
  project_id        text primary key references projects(id) on delete cascade,
  owner_id          uuid not null references auth.users(id) on delete cascade,
  steps             jsonb  not null default '{}'::jsonb,  -- pt3_proj_<id>_state     {stepId: bool}
  counters          jsonb  not null default '{}'::jsonb,  -- pt3_proj_<id>_ctrs      {stepId: int}
  cur               int    not null default 0,            -- pt3_proj_<id>_cur
  chart_rows        jsonb  not null default '{}'::jsonb,  -- pt3_proj_<id>_chartRows {phaseId: row}
  global_rows       int    not null default 0,            -- pt3_proj_<id>_grows
  clocks            jsonb  not null default '{}'::jsonb,  -- pt3_proj_<id>_clk       {fieldKey: epoch_ms}
  server_rev        bigint not null default 0,            -- pull cursor, set by trigger
  server_updated_at timestamptz not null default now()
);

-- NOTE: pt3_proj_<id>_base is deliberately absent. Each device keeps its own
-- record of what it last agreed with the server; the phone and the iPad
-- legitimately differ, which is what makes the merge three-way. Uploading it
-- would corrupt the other device's merge.

create index projects_owner_updated_idx
  on projects (owner_id, updated_ms desc) where deleted_ms is null;
create index project_progress_owner_rev_idx
  on project_progress (owner_id, server_rev);

-- Pull cursor: a single global sequence, so a client can ask for everything
-- newer than the highest rev it has seen without diffing every row.
create sequence project_progress_rev_seq;

create or replace function bump_server_rev() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_rev := nextval('public.project_progress_rev_seq');
  new.server_updated_at := now();
  return new;
end $$;

create trigger project_progress_rev
  before insert or update on project_progress
  for each row execute function bump_server_rev();

-- The anon key ships in the page, so RLS is the only thing between family
-- members' data. owner_id is denormalised onto project_progress specifically
-- so this policy needs no join — a policy that joins is a policy that gets
-- slow and then gets "optimised" by someone who doesn't realise it is a
-- security boundary.
--
-- auth.uid() is wrapped in a subselect so Postgres evaluates it once per query
-- rather than once per row.
alter table projects         enable row level security;
alter table project_progress enable row level security;

create policy own_projects on projects for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy own_progress on project_progress for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
