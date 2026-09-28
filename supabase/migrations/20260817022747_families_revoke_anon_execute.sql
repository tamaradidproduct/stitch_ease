-- Take the family functions out of the anonymous API surface.
--
-- Applied to stitch-ease-app (dozzilmrtjhinoactcve) on 2026-08-17, immediately
-- after 20260817022512_families.sql, in response to Supabase's security
-- advisor flagging all six as `anon`-executable.
--
-- Nothing leaked: each already refuses a signed-out caller (ensure_family,
-- create_family_invite and redeem_family_invite raise on a null auth.uid();
-- the two helpers and family_roster match no rows). But they were reachable at
-- /rest/v1/rpc/* with no session at all, which is API surface with no reason to
-- exist — and "it happens to return nothing" is a weaker guarantee than "it
-- cannot be called".
--
-- EXECUTE is deliberately KEPT for `authenticated`, and the advisor still
-- reports that. It is intentional, not an oversight:
--
--   * ensure_family / create_family_invite / redeem_family_invite /
--     family_roster ARE the client API. The whole feature is signed-in users
--     calling them.
--   * auth_family_ids / auth_family_user_ids are called from inside RLS policy
--     expressions, and Postgres evaluates those with the QUERYING user's
--     privileges. Revoking EXECUTE from `authenticated` there would not harden
--     anything — it would break every policy that calls them, which is every
--     policy protecting the PDFs.
revoke execute on function auth_family_ids()          from anon, public;
revoke execute on function auth_family_user_ids()     from anon, public;
revoke execute on function ensure_family()            from anon, public;
revoke execute on function create_family_invite()     from anon, public;
revoke execute on function redeem_family_invite(text) from anon, public;
revoke execute on function family_roster()            from anon, public;

grant execute on function auth_family_ids()          to authenticated;
grant execute on function auth_family_user_ids()     to authenticated;
grant execute on function ensure_family()            to authenticated;
grant execute on function create_family_invite()     to authenticated;
grant execute on function redeem_family_invite(text) to authenticated;
grant execute on function family_roster()            to authenticated;
