---
name: stitch-ease-dev-setup
description: Stitch Ease (PWA tracker) dev workflow — CI, staging, production approval gate, and the Airtable QA loop. Use when opening or merging a PR, deploying, or adding a QA test case in this repo.
---

# Stitch Ease tracker — dev setup

`CLAUDE.md` is the source of truth for app conventions; this is the workflow map.
Do not commit, push, open a PR, or merge until the user explicitly says so.

## CI (`.github/workflows/ci.yml`, PRs and pushes to `main`)
- `node scripts/check.mjs`: syntax-checks every `js/**` file and `sw.js`, parses `manifest.json`, and checks that every shipped script is in `index.html` and `sw.js` ASSETS, `app.js` loads last, and no selftest ships.
- `node --test scripts/*.test.mjs` runs only if such tests exist.
- Run `node scripts/check.mjs` locally before claiming a change is done.
- No build step: `scripts/build-site.sh` copies shipped files into `dist/` (no docs, supabase, scripts, selftests).

## Staging (`deploy-staging.yml`, every push to `main`)
- check, build-site, set `dist/CNAME` to `staging.app.stitch-ease.com`, publish to `tamaradidproduct/stitch-ease-staging` (`gh-pages`) with `STAGING_PAGES_TOKEN`.
- Final step posts SHA + commit messages to `AIRTABLE_STAGING_DEPLOY_WEBHOOK_URL` (best-effort).

## Production (`deploy.yml`, also every push to `main`)
- Builds, waits at the `production` environment's required-approval gate, then deploys via GitHub Pages Actions.
- Approve only after checking staging. Merging a PR no longer deploys by itself.
- Still bump `CACHE` in `sw.js` when cached assets change.

## Airtable QA loop
- Base `app48cJR6Trt1Mwbe` ("Stitch Ease Knitting QA"): **Findings** `tbl0oEhUjzY7LTtcm`, **Test Cases** `tblHqeMuQ7NSyJnkA`, **Deployments** `tblHR2lbYGsM3kv1v` (written by the staging webhook).
- PRs that fix a Finding: never `Closes/Fixes/Resolves #N`; use `Refs #N` or `(#N)` in the commit subject. Staging deploy then sets the Finding to `Ready to retest`; QA sets `Resolved`.
- New manual-QA cases go in Test Cases (not GitHub issues): Title, Area, Platform, Test Priority, Steps, Expected Result, Lifecycle `Ready`; source PR/issue in Notes.
