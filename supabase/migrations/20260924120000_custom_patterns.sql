-- Custom patterns, synced across the family (js/cloud/patternsync.js).
--
-- NOT YET APPLIED. Written 2026-09-24; apply to stitch-ease-app
-- (dozzilmrtjhinoactcve) only with the owner's go-ahead, then change this line
-- to the date it was run. No CLI in this project: this file is the record.
--
-- Purely additive: a new table, its trigger and its policies. Nothing here
-- touches projects, project_progress or pattern_pdfs, and no deployed client
-- reads or writes this table, so applying it before the client ships breaks
-- nothing (see 20260821025013_pattern_pdfs_restore_owner_key for what happens
-- when a migration forgets the deployed client).
--
-- ── The problem ──
--
-- A pattern imported on-device (CSV or .stitchchart.json) lived only in that
-- device's localStorage. A project started from it synced to the account's
-- other devices, which had no pattern to open it with — the "pattern missing
-- from this build" state, for a pattern that was never going to be in any build.
--
-- ── Shape: one row per (uploader, pattern), readable by the family ──
--
-- The same model pattern_pdfs settled on in 20260821025013: owner_id is part of
-- the key, family_id is the access boundary. Each person's import is their own
-- row; nobody's push can overwrite anyone else's; the client takes the newest
-- row per pattern_id across the family (updated_ms, last-write-wins). A remove
-- is a tombstone row (deleted_ms set, pattern_doc null), which wins or loses by
-- the same clock — a hard delete would let another device upload its copy
-- straight back, as with projects and PDFs.
--
-- ── Why the doc travels on pull, when a PDF's bytes do not ──
--
-- A pattern doc is JSON, typically 5-50KB — the size of the frozen snapshot
-- every project already syncs. The client still reads METADATA every pull and
-- fetches a doc only when its clock says it changed, so a quiet family costs a
-- few hundred bytes per pull.

create table custom_patterns (
  owner_id     uuid   not null references auth.users(id) on delete cascade,
  family_id    uuid   not null references families(id) on delete cascade,
  pattern_id   text   not null check (char_length(pattern_id) between 1 and 120),
  name         text   not null default '' check (char_length(name) <= 400),
  -- null only on a tombstone. Bounded so one bad import cannot park megabytes
  -- in every family member's localStorage — the quota save() needs.
  pattern_doc  jsonb  check (pattern_doc is null or octet_length(pattern_doc::text) <= 2000000),
  updated_ms   bigint not null,                                  -- client clock (syncNow); LWW
  deleted_ms   bigint,                                           -- tombstone, never hard-delete
  server_updated_at timestamptz not null default now(),
  primary key (owner_id, pattern_id),
  check (deleted_ms is not null or pattern_doc is not null)
);

-- The pull reads "every row in my family" (metadata only) on each pass.
create index custom_patterns_family_idx on custom_patterns (family_id, pattern_id);

-- Stamps server_updated_at, and makes last-write-wins hold on the server too.
--
-- The client reads the newest clock before it writes, but two of ONE person's
-- devices can both read, then both write — the later request would win even
-- when it carries the older clock. Skipping an update whose clock is behind
-- the stored one closes that window without a server_rev dance: returning NULL
-- from a BEFORE UPDATE trigger drops that row's update, and an upsert reports
-- success, so the losing device learns the truth on its next pull.
create or replace function touch_custom_pattern() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_ms < old.updated_ms then
    return null;
  end if;
  new.server_updated_at := now();
  return new;
end $$;

create trigger custom_patterns_touch
  before insert or update on custom_patterns
  for each row execute function touch_custom_pattern();

alter table custom_patterns enable row level security;

-- Read: the family. Uses auth_family_ids() (SECURITY DEFINER, see
-- 20260817022512_families.sql) because a direct family_members subquery would
-- recurse into that table's own policy.
create policy family_custom_patterns_read on custom_patterns for select
  to authenticated using (family_id in (select auth_family_ids()));

-- Write: your own row, into a family you belong to. Stricter than pattern_pdfs'
-- family-wide update policy on purpose — with owner in the key there is never
-- a reason to touch someone else's row, and pattern docs are rendered as HTML
-- on the other members' devices.
create policy own_custom_patterns_insert on custom_patterns for insert
  to authenticated
  with check (owner_id = (select auth.uid()) and family_id in (select auth_family_ids()));
create policy own_custom_patterns_update on custom_patterns for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and family_id in (select auth_family_ids()));
-- No DELETE policy: a remove is a tombstone, never a hard delete.

comment on table custom_patterns is
  'Patterns imported on-device (CSV / .stitchchart.json), shared across the family. One row per (uploader, pattern); newest updated_ms per pattern_id wins; deleted_ms is a tombstone. See js/cloud/patternsync.js.';
