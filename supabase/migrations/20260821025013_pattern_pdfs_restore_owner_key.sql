-- Unbreak PDF uploads for the DEPLOYED client.
--
-- 20260817022512_families.sql was applied while the live app was still the
-- pre-family build, and it broke that build in two ways at once:
--
-- 23502 family_id was added NOT NULL with no default, and the deployed
-- client does not send it.
-- 42P10 the primary key moved from (owner_id, pattern_id) to
-- (family_id, pattern_id), so the deployed client's
-- `onConflict: 'owner_id,pattern_id'` had no constraint to match.
--
-- Every attach has failed since. That was an avoidable mistake: a schema
-- change must keep the currently-deployed client working, because there is
-- always a window where the old code is live — and here the new client is not
-- even merged yet.
--
-- ── The fix, and why it is not a shim ──
--
-- The PK goes back to (owner_id, pattern_id) permanently. family_id stays, and
-- stays the access boundary, but it is no longer part of the key.
--
-- That is the better model anyway. Keyed by family, two members attaching the
-- same pattern had to collapse into one row, and whoever pushed second silently
-- replaced the other's upload. Keyed by owner, each person's upload is their
-- own row, the family can see all of them, and the client picks the newest by
-- updated_ms — which is the last-write-wins rule this table already used. No
-- data is destroyed by someone else's push.
--
-- A temporary unique index on (owner_id, pattern_id) would also have unbroken
-- the old client, but it would then have blocked the new one: changing family
-- re-uploads the same pattern under a new family_id, which such an index would
-- reject. Reverting the key avoids needing to remember to drop anything.

alter table pattern_pdfs drop constraint pattern_pdfs_pkey;
alter table pattern_pdfs add primary key (owner_id, pattern_id);

-- family_id is still required, but the deployed client cannot supply it, so
-- the server fills it in. SECURITY DEFINER because `families` has no INSERT
-- policy — a first-time uploader has no family row yet and cannot make one.
create or replace function fill_pattern_pdf_family()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare fid uuid;
begin
 if new.family_id is not null then return new; end if;
 select family_id into fid from public.family_members where user_id = new.owner_id limit 1;
 if fid is null then
 insert into public.families (created_by) values (new.owner_id) returning id into fid;
 insert into public.family_members (family_id, user_id, role) values (fid, new.owner_id, 'owner');
 end if;
 new.family_id := fid;
 return new;
end $$;

create trigger pattern_pdfs_fill_family
 before insert or update on pattern_pdfs
 for each row execute function fill_pattern_pdf_family();

revoke execute on function fill_pattern_pdf_family() from anon, public;

-- The family lookup index is still what the reads use; the old owner-scoped
-- index is now the PK again.
drop index if exists pattern_pdfs_family_updated_idx;
create index pattern_pdfs_family_updated_idx on pattern_pdfs (family_id, updated_ms desc);
