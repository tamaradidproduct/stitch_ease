-- pattern_pdfs update/delete: restrict to the row's owner.
--
-- 20260821025013_pattern_pdfs_restore_owner_key.sql moved the primary key back
-- to (owner_id, pattern_id) — each family member's upload is now its own row,
-- not one shared row keyed by family_id. family_pattern_pdfs_update and
-- family_pattern_pdfs_delete (from 20260817022638_families.sql) were never
-- updated to match: their USING clause is still "any row this family can
-- read", so any family member can retarget or delete another member's PDF
-- row. Reads stay family-wide on purpose — that's the whole point of the
-- table. Only update/delete narrow to the owner.

drop policy if exists family_pattern_pdfs_update on pattern_pdfs;
create policy family_pattern_pdfs_update on pattern_pdfs for update
  to authenticated using (owner_id = (select auth.uid()))
  with check (family_id in (select auth_family_ids()) and owner_id = (select auth.uid()));

drop policy if exists family_pattern_pdfs_delete on pattern_pdfs;
create policy family_pattern_pdfs_delete on pattern_pdfs for delete
  to authenticated using (owner_id = (select auth.uid()));
