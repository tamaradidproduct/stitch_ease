-- The original pattern PDF, synced (js/core/pdf.js, js/cloud/pdfsync.js).
--
-- Applied to stitch-ease-app (dozzilmrtjhinoactcve) on 2026-08-14. No CLI in
-- this project: this file is the record of what was run, not the thing that
-- runs it.
--
-- Purely additive. Nothing here touches `projects` or `project_progress`, which
-- hold real knitting progress.
--
-- ── Why a PRIVATE bucket ──
--
-- These are bought patterns. A public bucket would put every one of them at a
-- guessable URL, readable by anyone — which is the exact reason they are kept
-- out of the git repo in the first place (the Pages site is public). Private
-- bucket, owner-only policies, and short-lived signed URLs for reading. There
-- is no case in which this bucket should become public.
--
-- ── Why a metadata table as well as the objects ──
--
-- Three things storage.objects cannot do on its own:
--
--   1. Answer "is there a newer copy than mine?" without a download. A device
--      must be able to sync the FACT of a PDF cheaply and fetch the megabytes
--      only when the knitter actually opens it — on a phone, on mobile data,
--      pulling 8MB in the background on the off-chance is hostile.
--   2. Carry the original filename. The object is keyed by pattern id, because
--      that is what makes it addressable; "lenore-nevermore-2026.pdf" is what
--      the user recognises, and it has to survive the round trip.
--   3. Tombstone a delete. Removing the object leaves nothing behind to say it
--      was removed, so the other device would helpfully upload its copy again —
--      the same reason projects are soft-deleted rather than dropped.
--
-- ── Why last-write-wins and no clock map ──
--
-- A PDF is one opaque blob. There are no fields to merge, so the per-field
-- clocks and three-way merge that progress needs would be machinery with
-- nothing to do. `updated_ms` is the client clock (syncNow(), so it is already
-- skew-corrected) and the newest write wins, exactly as the projects registry
-- resolves a rename.

create table pattern_pdfs (
  owner_id     uuid   not null references auth.users(id) on delete cascade,
  pattern_id   text   not null,                                  -- PATTERNS[].id, e.g. 'lenore'
  file_name    text   not null check (char_length(file_name) <= 260),
  byte_size    bigint not null check (byte_size >= 0),
  content_type text   not null default 'application/pdf',
  updated_ms   bigint not null,                                  -- client clock; LWW
  deleted_ms   bigint,                                           -- tombstone, never hard-delete
  -- Denormalised rather than derived. The client needs the exact object key to
  -- sign a URL, and recomputing it in two places is how the two drift.
  storage_path text   not null,
  server_updated_at timestamptz not null default now(),
  primary key (owner_id, pattern_id)
);

-- The client reads "everything for me, newest first" and nothing else — there
-- is one row per pattern, so a handful per account. No pull cursor and no rev
-- sequence: progress needs one because it is written on every tap, and this is
-- written when someone attaches a file.
create index pattern_pdfs_owner_updated_idx
  on pattern_pdfs (owner_id, updated_ms desc);

create or replace function touch_pattern_pdf() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := now();
  return new;
end $$;

create trigger pattern_pdfs_touch
  before insert or update on pattern_pdfs
  for each row execute function touch_pattern_pdf();

-- The anon key ships in the page, so RLS is the only thing between family
-- members' data. auth.uid() is wrapped in a subselect so Postgres evaluates it
-- once per query rather than once per row — same as own_projects.
alter table pattern_pdfs enable row level security;

create policy own_pattern_pdfs on pattern_pdfs for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ── The bucket ──
--
-- public=false is the security boundary, not a preference. The size limit
-- mirrors PDF_MAX_BYTES in js/core/pdf.js; having it server-side too means a
-- client that skips the check (or a future one that forgets it) still cannot
-- park a 2GB scan in the project's storage quota.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pattern-pdfs', 'pattern-pdfs', false, 104857600, array['application/pdf'])
on conflict (id) do nothing;

-- Object keys are '<owner_uid>/<patternId>.pdf'. The first path segment IS the
-- authorisation check: a user may only touch objects under their own uid.
-- Separate policies per verb rather than one FOR ALL, because storage needs
-- INSERT and UPDATE to be distinguishable — an upsert of a replaced PDF is an
-- update, and a policy that only covered insert would fail on the second
-- attach with an error that reads like a bug.
create policy "own pattern pdfs: read" on storage.objects for select
  to authenticated
  using (bucket_id = 'pattern-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own pattern pdfs: insert" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'pattern-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own pattern pdfs: update" on storage.objects for update
  to authenticated
  using (bucket_id = 'pattern-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'pattern-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own pattern pdfs: delete" on storage.objects for delete
  to authenticated
  using (bucket_id = 'pattern-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);

comment on table pattern_pdfs is
  'One row per (account, pattern): the metadata for an attached original-pattern PDF. Bytes live in the private pattern-pdfs bucket at <uid>/<patternId>.pdf. See js/cloud/pdfsync.js.';
