# Phase 3 — Supabase schema

Backend groundwork. No auth, no sync, no client code that runs in anger. The aim is a
schema that matches what Phase 2 already writes, with RLS proven correct *before* anything
can reach it.

## What already exists

The original plan opened with "create a Supabase project". Don't — one is already here and
wired to this repo:

| | |
|---|---|
| Project ref | `dozzilmrtjhinoactcve` |
| Status | Live (the API gateway answers; not paused) |
| Integration | Official Supabase GitHub App, posting a check on every PR since #26 |
| Preview branching | **Disabled** — "Creating a new preview branch per PR is disabled" |
| Repo contents | No `supabase/` directory, no config, no migrations |

There was one historical failure (`failed to connect to postgres … dial error: timeout`)
at commit `8f5c464`, the signature of a free-tier project that had gone idle. It answers
now.

**Unknown, and blocking 3.1:** what is already *in* the database. If an earlier experiment
left tables behind, the SQL below could collide with them. That is what 3.0 settles.

## Status — 3.0 to 3.3 are DONE

Applied 2026-08-11 to `stitch-ease-app` (`dozzilmrtjhinoactcve`, ca-central-1, Postgres 17).

- **3.0 inventory** — the project was completely empty: no tables, no migrations, no users.
  There is also a second project in the org, `stitch-ease-knitting-archive`
  (`mciveuhlmtzepmsqkury`), INACTIVE since May 2025 — left alone deliberately.
- **3.1 schema** — applied as migration `20260811174743_projects_and_progress`, recorded at
  `supabase/migrations/`.
- **3.2 RLS** — enabled on both tables with owner-only policies.
- **3.3 proof** — all checks pass, both directions, plus the signed-out case. See below.
- Supabase's own security advisor reports **zero findings**.

- **3.4 migration convention** — `supabase/migrations/` is the record; the dashboard (or
  this MCP connection) applies it. No CLI, no toolchain.
- **3.5 vendored client** — `@supabase/supabase-js@2.112.3` UMD, 207K, MIT, pinned.
  `sha256 ec004176d101aec77aeef266aa1c94411287fe2039c65ea5f6c72f5e14b3847d`.
  Loaded first in `index.html`, precached, cache bumped to `stitch-ease-v7`.

**Phase 3 is complete.** Nothing calls the client yet — that is Phase 4.

### The failure-mode test (risk §H10)

Renaming `js/vendor/supabase.js` away so it 404s, the app is **byte-identical**: same
rendered HTML length and text on both the home and project screens, same chart row, still
fully knittable, still stamping clocks. The only console output is the expected 404.

The first run of this comparison showed the clock key set differing, which looked like a
real effect of the missing vendor file. It was not: the test setup had cleared all `pt3_`
keys including `pt3_schema`, so `migrateAddClocks()` re-ran on reload and backfilled every
key. Restoring the vendor file and re-checking gave the *same* 39 keys, which is what
proved the difference was the migration rather than the vendor. Worth remembering that a
fixture that clears storage also clears migration sentinels.

### What the RLS proof actually showed

Two fake users, one project and one progress row each:

| check | user A | user B |
|---|---|---|
| SELECT projects | only own | only own |
| SELECT progress | only own | only own |
| UPDATE the other's project | 0 rows | 0 rows |
| DELETE the other's row | 0 rows | 0 rows |
| INSERT owned by the other | blocked by with-check | — |

Signed out (`anon`, which is what the shipped key resolves to): `auth.uid()` null, zero
projects, zero progress, 0 rows on update. The `server_rev` trigger produced distinct
increasing values (1, 2) across two inserts. All test rows and users were deleted
afterwards — all three tables are back to 0 rows.

One methodological note, since it nearly produced a false alarm: an early version of the
anon check used `set_config(...)` inside a subquery, which does not apply before the outer
query executes, so it silently ran as the service role and appeared to show anon reading
everything. Role switching has to happen in its own transaction with `set local role`.
**A passing RLS test that never actually changed role is worse than no test.**

## 3.0 — Inventory the project

*Done — see Status above. Kept for the record, and for when a second project is set up.*

In the Supabase dashboard → SQL Editor:

```sql
-- Tables, and whether RLS is on
select c.relname            as table_name,
       c.relrowsecurity     as rls_enabled,
       (select count(*) from pg_policy p where p.polrelid = c.oid) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

-- Existing users, if any
select count(*) as users from auth.users;

-- Anything in the storage or realtime schemas worth knowing about
select schemaname, tablename from pg_tables
where schemaname not in ('pg_catalog','information_schema')
order by 1,2;
```

Three outcomes:

- **Empty** — proceed to 3.1 as written.
- **Tables named `projects` / `project_progress` from an earlier attempt** — send me the
  output of `\d projects` and `\d project_progress` (or the table definitions from the
  dashboard) and I will write 3.1 as an ALTER path instead of CREATE.
- **Unrelated tables from a different experiment** — decide whether to reuse this project
  or start a clean one. Reusing is fine; the schema below is namespaced by table name, not
  by schema.

## 3.1 — Schema

**This differs from the original plan §A**, because Phase 2 shipped a different shape than
the plan assumed. The differences are not cosmetic:

| plan §A said | Phase 2 actually writes | why |
|---|---|---|
| `chart_row int` | `chart_rows jsonb` | Chart rows became per-phase (`chartRows`, a `{phaseId: row}` map) when Frost Flower added a second chart |
| `client_clock bigint` on projects | `updatedAt` / `deletedAt` on registry records | Registry records carry their own timestamps rather than a separate clock column |
| `clocks` keyed `chart_row` | keyed `cr:<phaseId>` | Same per-phase reason |

```sql
create table projects (
  id                 text primary key,          -- CLIENT-generated (newId()), so offline creates need no round trip
  owner_id           uuid not null references auth.users(id) on delete cascade,
  name               text not null check (char_length(name) <= 120),
  pattern_id         text not null,             -- 'peacock-tee' | 'frost-flower-cardigan' | …
  created_ms         bigint not null,           -- registry `created`
  updated_ms         bigint not null,           -- registry `updatedAt`
  deleted_ms         bigint,                    -- registry `deletedAt` — tombstone, never hard-delete
  pattern_struct_hash text,                     -- Phase 8; null until then
  pattern_doc        jsonb,                     -- Phase 8; null while the code pattern matches
  server_updated_at  timestamptz not null default now()
);

create table project_progress (                  -- 1:1 with projects
  project_id        text primary key references projects(id) on delete cascade,
  owner_id          uuid not null references auth.users(id) on delete cascade,
  steps             jsonb  not null default '{}',  -- pt3_proj_<id>_state    {stepId: bool}
  counters          jsonb  not null default '{}',  -- pt3_proj_<id>_ctrs     {stepId: int}
  cur               int    not null default 0,     -- pt3_proj_<id>_cur
  chart_rows        jsonb  not null default '{}',  -- pt3_proj_<id>_chartRows {phaseId: row}
  global_rows       int    not null default 0,     -- pt3_proj_<id>_grows
  clocks            jsonb  not null default '{}',  -- pt3_proj_<id>_clk      {fieldKey: epoch_ms}
  server_rev        bigint not null default 1,     -- pull cursor
  server_updated_at timestamptz not null default now()
);

create index on projects (owner_id, updated_ms desc) where deleted_ms is null;
create index on project_progress (owner_id, server_rev);
```

**`base` is deliberately absent.** `pt3_proj_<id>_base` is each device's own record of what
it last agreed with the server. The phone and the iPad legitimately hold different
baselines — that is the whole point of a three-way merge. Uploading it would be
meaningless at best and would corrupt the other device's merge at worst.

**One progress row per project, not one per step.** It maps 1:1 onto what `save()` already
writes, and the `clocks` map already gives per-field granularity at single-row cost.
Per-step rows would mean up to 55 upserts after an offline session and buy nothing.

### `server_rev` trigger

The pull cursor. Without it a client has to diff every row it has ever seen.

```sql
create sequence project_progress_rev_seq;

create or replace function bump_server_rev() returns trigger
language plpgsql as $$
begin
  new.server_rev := nextval('project_progress_rev_seq');
  new.server_updated_at := now();
  return new;
end $$;

create trigger project_progress_rev
  before insert or update on project_progress
  for each row execute function bump_server_rev();
```

A client then pulls with `where owner_id = auth.uid() and server_rev > <cursor>`.

## 3.2 — Row-level security

The anon key ships in the page. RLS is the *only* thing standing between family members'
data. Off on one table is a full leak.

```sql
alter table projects         enable row level security;
alter table project_progress enable row level security;

create policy own_projects on projects for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy own_progress on project_progress for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
```

`owner_id` is denormalised onto `project_progress` specifically so this policy needs no
join — a policy that joins is a policy that gets slow and then gets "optimised" by someone
who does not realise it is a security boundary.

No `profiles` table: `auth.users` already holds the email, and with no sharing there is
nobody to attribute anything to.

## 3.3 — Prove RLS works

**Do this before Phase 4 ships, not after.** An RLS mistake is not visible from the app —
everything looks fine while every family member can read everyone else's data.

In the SQL Editor:

```sql
-- Two fake users
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local');

insert into projects (id, owner_id, name, pattern_id, created_ms, updated_ms) values
  ('proj-a', '11111111-1111-1111-1111-111111111111', 'A tee', 'peacock-tee', 1, 1),
  ('proj-b', '22222222-2222-2222-2222-222222222222', 'B tee', 'peacock-tee', 1, 1);

-- Become user A
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select id from projects;                                  -- expect ONLY proj-a
update projects set name = 'hacked' where id = 'proj-b';   -- expect 0 rows
delete from projects where id = 'proj-b';                  -- expect 0 rows
insert into projects (id, owner_id, name, pattern_id, created_ms, updated_ms)
  values ('proj-c','22222222-2222-2222-2222-222222222222','C','peacock-tee',1,1);
                                                           -- expect: violates with-check
```

Every one of those five must behave as noted. Then repeat as user B, and clean up:

```sql
reset role;
delete from projects where id in ('proj-a','proj-b','proj-c');
delete from auth.users where email in ('a@test.local','b@test.local');
```

## 3.4 — Where the SQL lives

The Supabase GitHub App is already connected, which makes migration files the natural home
— but preview branching is **off**, and turning it on means every PR spins up a real
preview database.

Recommended: **keep branching off, keep the SQL in the repo anyway.**

```
supabase/migrations/0001_projects_and_progress.sql
```

Apply it by pasting into the SQL Editor. The file is the record of what the schema is; the
dashboard is how it gets there. That needs no CLI, no toolchain, and no build step — which
is the constraint this project has held to throughout.

Turning branching on is a later, reversible decision. It is worth it once schema changes
become frequent; for one migration it is overhead.

## 3.5 — Vendor the client (no calls yet)

```bash
curl -L https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js -o js/vendor/supabase.js
```

Committed, not CDN-loaded: it works offline on first load, sits in the SW precache, pins
the version, and keeps a third-party origin out of the critical path.

Add `<script src="js/vendor/supabase.js"></script>` **first** in the list in `index.html`,
add it to `ASSETS` in `sw.js`, and bump the cache to `stitch-ease-v7`.

Then the check that matters: **rename the file and reload.** The app must behave exactly as
it does today. Cloud features are additive; a failed vendor load disables them and nothing
else.

## Definition of done

- [ ] 3.0 inventory run, results known
- [ ] Tables created, matching the Phase 2 shapes above
- [ ] `server_rev` trigger firing (insert a row twice, watch it increment)
- [ ] RLS enabled on both tables
- [ ] All five impersonation checks pass, for both users
- [ ] Test rows and test users cleaned up
- [ ] `supabase/migrations/0001_*.sql` committed
- [ ] `js/vendor/supabase.js` committed, precached, cache bumped
- [ ] App verified byte-identical with the vendor file renamed away

Nothing in this phase changes app behaviour. If it does, something is wrong.

## Open questions

1. **Is `dozzilmrtjhinoactcve` the project to use**, or a leftover experiment? A clean
   project costs nothing on the free tier.
2. **What is already in it?** — 3.0.
3. **Free-tier pausing.** It idled out at least once. Free projects pause after ~1 week of
   inactivity, and a paused project means sync fails for everyone until someone opens the
   dashboard. Worth knowing before the family depends on it.
