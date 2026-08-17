-- Families: share a pattern PDF once, across the household.
--
-- Applied to stitch-ease-app (dozzilmrtjhinoactcve) on 2026-08-17. No CLI in
-- this project; this file is the record of what was run.
--
-- ── The problem ──
--
-- A pattern PDF was scoped to ONE account. Two accounts exist and only one of
-- them holds the projects, so a 6.7MB Lenore PDF uploaded on one login was
-- invisible to the other by construction — every family member would have had
-- to find and attach the same bought file themselves. The document belongs to
-- the pattern, and the pattern belongs to the household.
--
-- ── Why not just open reads to `authenticated` ──
--
-- Sign-up on this project is open (magic link + Google), so "any signed-in
-- user" means "anyone who cares to make an account". These are bought
-- patterns; that is the same redistribution problem as committing them to the
-- public Pages repo, only with an extra click in front of it. A family is a
-- closed set you are invited into.
--
-- ── Why the storage path does NOT change ──
--
-- Objects stay at '<uploader_uid>/<patternId>.pdf'. Re-pathing them to
-- '<family_id>/...' would be the tidier key, but the bytes live in S3 under
-- that name: moving them needs the Storage API object by object, and there is
-- already a real 6.7MB upload in there. Rewriting storage.objects.name in SQL
-- alone would point the row at bytes that are not there — a PDF that lists
-- fine and 404s on open.
--
-- So the path stays put and only the READ policy widens: you may read an
-- object in another member's folder if you share a family with them. WRITES
-- stay strictly own-folder, so nobody can plant a file under someone else's
-- uid.

create table families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'My family' check (char_length(name) <= 80),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table family_members (
  family_id uuid not null references families(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_idx on family_members (user_id);

-- Single-use, expiring join code. Short enough to read down the phone, random
-- enough that guessing one is not a way into someone's household.
create table family_invites (
  code       text primary key,
  family_id  uuid not null references families(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by    uuid references auth.users(id) on delete set null,
  used_at    timestamptz
);
create index family_invites_family_idx on family_invites (family_id);

-- ── The recursion trap ──
--
-- The obvious policy on family_members — "you may see rows whose family_id is
-- one of your families" — has to read family_members to answer that, which
-- reads family_members, which… Postgres raises `infinite recursion detected in
-- policy`. Every RLS design over a membership table hits this.
--
-- So membership is resolved by a SECURITY DEFINER function, which runs as its
-- owner and is therefore not subject to the policy it would otherwise re-enter.
-- `search_path` is pinned to empty and every reference is schema-qualified:
-- a SECURITY DEFINER function with a mutable search_path is a privilege
-- escalation waiting for someone to create a table that shadows one of these.
create or replace function auth_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id from public.family_members where user_id = auth.uid()
$$;

-- The uids this account is allowed to read storage folders for: everyone who
-- shares a family with it, including itself.
create or replace function auth_family_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select fm.user_id
  from public.family_members fm
  where fm.family_id in (select family_id from public.family_members where user_id = auth.uid())
  union
  select auth.uid()
$$;

-- Every account gets a family on first sign-in, so the sharing path is never a
-- special case the client has to set up before it can store anything.
-- Idempotent: returns the existing one if there is any.
create or replace function ensure_family()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select family_id into fid from public.family_members where user_id = auth.uid() limit 1;
  if fid is not null then return fid; end if;
  insert into public.families (created_by) values (auth.uid()) returning id into fid;
  insert into public.family_members (family_id, user_id, role) values (fid, auth.uid(), 'owner');
  return fid;
end $$;

create or replace function create_family_invite()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare fid uuid; c text;
begin
  fid := public.ensure_family();
  -- Ambiguous characters left out on purpose: this gets read aloud or typed
  -- off a screen, and 0/O and 1/I/L are where that goes wrong.
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',
                           (floor(random() * 31) + 1)::int, 1), '')
    into c from generate_series(1, 8);
  insert into public.family_invites (code, family_id, created_by, expires_at)
  values (c, fid, auth.uid(), now() + interval '7 days');
  return c;
end $$;

-- Joining is the one action that must reach across the boundary — the joiner
-- is by definition not yet a member, so no membership policy could permit it.
-- The invite code IS the authorisation, which is why it is single-use and
-- expiring, and why redeeming is a function rather than an INSERT the client
-- could aim anywhere.
create or replace function redeem_family_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare inv public.family_invites;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into inv from public.family_invites
   where code = upper(trim(p_code)) for update;
  if inv.code is null           then raise exception 'invalid code'; end if;
  if inv.used_by is not null    then raise exception 'code already used'; end if;
  if inv.expires_at < now()     then raise exception 'code expired'; end if;

  -- Leaving the old family rather than joining a second: a PDF resolves
  -- through "my family", and belonging to two makes that question ambiguous
  -- with no way for the user to say which they meant.
  delete from public.family_members where user_id = auth.uid();
  insert into public.family_members (family_id, user_id, role)
  values (inv.family_id, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  update public.family_invites set used_by = auth.uid(), used_at = now() where code = inv.code;
  return inv.family_id;
end $$;

-- Who is in my family, for the account sheet. A function because
-- family_members' own policy is deliberately self-rows-only.
create or replace function family_roster()
returns table (user_id uuid, email text, role text, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select fm.user_id, u.email::text, fm.role, fm.joined_at
  from public.family_members fm
  join auth.users u on u.id = fm.user_id
  where fm.family_id in (select family_id from public.family_members where user_id = auth.uid())
  order by fm.joined_at
$$;

alter table families       enable row level security;
alter table family_members enable row level security;
alter table family_invites enable row level security;

create policy own_families on families for select
  to authenticated using (id in (select auth_family_ids()));

-- Self-rows only. Anything broader re-enters this policy; the roster is served
-- by family_roster() instead.
create policy own_membership on family_members for select
  to authenticated using (user_id = (select auth.uid()));

-- Leaving is the one membership write a client may do directly.
create policy leave_family on family_members for delete
  to authenticated using (user_id = (select auth.uid()));

-- Invites are readable by the family that owns them, so the sheet can show a
-- code that is still outstanding. Creating and redeeming go through the
-- functions above; there is no INSERT policy on purpose.
create policy own_invites on family_invites for select
  to authenticated using (family_id in (select auth_family_ids()));

-- ── pattern_pdfs becomes family-scoped ──
--
-- One PDF per pattern per FAMILY, not per account. `owner_id` stays as who
-- uploaded it, because that is what the storage path is built from and what
-- decides who may overwrite the bytes.
alter table pattern_pdfs add column if not exists family_id uuid references families(id) on delete cascade;

-- Backfill: give every existing row's owner a family and point the row at it.
-- Runs before the column is made NOT NULL, and covers the one real Lenore row.
do $$
declare r record; fid uuid;
begin
  for r in select distinct owner_id from pattern_pdfs where family_id is null loop
    select fm.family_id into fid from family_members fm where fm.user_id = r.owner_id limit 1;
    if fid is null then
      insert into families (created_by) values (r.owner_id) returning id into fid;
      insert into family_members (family_id, user_id, role) values (fid, r.owner_id, 'owner');
    end if;
    update pattern_pdfs set family_id = fid where owner_id = r.owner_id and family_id is null;
  end loop;
end $$;

alter table pattern_pdfs alter column family_id set not null;

-- The key changes from (owner_id, pattern_id) to (family_id, pattern_id): the
-- family is what owns a pattern's document now, and two members attaching the
-- same pattern must resolve to one row rather than silently keeping two the
-- client would have to choose between.
alter table pattern_pdfs drop constraint pattern_pdfs_pkey;
alter table pattern_pdfs add primary key (family_id, pattern_id);
create index pattern_pdfs_family_updated_idx on pattern_pdfs (family_id, updated_ms desc);

drop policy if exists own_pattern_pdfs on pattern_pdfs;

-- Read: anyone in the family. Write: also anyone in the family (a household
-- member replacing a stale scan is the point), but owner_id must be yourself,
-- so a row can never claim someone else uploaded it.
create policy family_pattern_pdfs_read on pattern_pdfs for select
  to authenticated using (family_id in (select auth_family_ids()));
create policy family_pattern_pdfs_write on pattern_pdfs for insert
  to authenticated with check (family_id in (select auth_family_ids()) and owner_id = (select auth.uid()));
create policy family_pattern_pdfs_update on pattern_pdfs for update
  to authenticated using (family_id in (select auth_family_ids()))
  with check (family_id in (select auth_family_ids()) and owner_id = (select auth.uid()));
create policy family_pattern_pdfs_delete on pattern_pdfs for delete
  to authenticated using (family_id in (select auth_family_ids()));

-- ── Storage: read widens to the family, writes stay own-folder ──
drop policy if exists "own pattern pdfs: read" on storage.objects;

create policy "family pattern pdfs: read" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'pattern-pdfs'
    and ((storage.foldername(name))[1])::uuid in (select auth_family_user_ids())
  );

comment on table families is
  'A household. Pattern PDFs are shared across it; projects and progress remain per-account.';
comment on column pattern_pdfs.owner_id is
  'Who uploaded it — the storage path is <owner_id>/<pattern_id>.pdf. Not an access check; the family is.';
