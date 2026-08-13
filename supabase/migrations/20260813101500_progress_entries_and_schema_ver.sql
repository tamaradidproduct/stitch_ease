-- Sections/rows/repeats model (docs/rows-sections-model.md, step 5).
--
-- Applied to stitch-ease-app on 2026-08-13. This project has no Supabase CLI;
-- the files here are the record of what was run, not the thing that runs it.
--
-- Progress moves from step ids to entry ids, and a repeat's position is a
-- {y,z} pair that must travel as ONE value. `counters` is typed for ints and
-- joinFields() coerces it with |0, which would flatten a position to zero, so
-- the new namespace gets its own column rather than reusing that one.
--
-- Additive on purpose: `steps`, `counters` and `global_rows` stay exactly as
-- they are. A client on the old code neither reads nor writes `entries`, so
-- applying this ahead of the deploy changes nothing for anyone.
alter table project_progress
  add column if not exists entries jsonb not null default '{}'::jsonb;

-- Which progress namespace last wrote this row.
--   1  s:<stepId> / c:<stepId> / global_rows   (pre-conversion)
--   2  n:/r:/rp:<entryId>                      (entries model)
--
-- The two namespaces do not overlap, and splitFields() drops prefixes it does
-- not recognise — so without this marker a device on one version would
-- silently discard everything the other wrote, with no conflict raised. The
-- client compares this against its own PROGRESS_SCHEMA and refuses to merge a
-- row it does not understand, surfacing a banner instead of losing rows.
--
-- Defaults to 1: any row already on the server was written by a v1 client.
alter table project_progress
  add column if not exists schema_ver int not null default 1;

comment on column project_progress.entries is
  'pt3_proj_<id>_entries — {n:<id>|r:<id>: bool, rp:<id>: {y,z}}';
comment on column project_progress.schema_ver is
  'Progress namespace version that last wrote this row. See PROGRESS_SCHEMA in js/cloud/sync.js.';

-- NOTE: steps / counters / global_rows are deliberately NOT dropped. They are
-- the only copy of a v1 client's progress, and a device that has not taken the
-- update yet still reads and writes them. Dropping them is a later commit,
-- once both devices are known to be on v2.
