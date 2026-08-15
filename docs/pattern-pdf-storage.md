# The original pattern PDF — storage and sync

Applied to `stitch-ease-app` (`dozzilmrtjhinoactcve`) on **2026-08-14** as migration
`pattern_pdfs`, recorded at `supabase/migrations/20260814135536_pattern_pdfs.sql`.

## What this is for

The tracker is a transcription: no schematics, no photographs, no sizing table, none of the
designer's prose. When a knitter needs any of that mid-project the answer has been "go and
find the email you bought it in", which on a phone, mid-row, is no answer at all.

A document icon in the section header — beside the notes book, on every section including
the chart — opens the original.

## Where a PDF can come from

| source | where it lives | reaches other devices |
|---|---|---|
| **bundled** | `pdf/<name>.pdf`, shipped with the deploy | automatically, with the deploy |
| **attached** | IndexedDB on the device, mirrored to the `pattern-pdfs` bucket | metadata on the next pull; bytes on demand |

An **attached file wins** over a bundled one — attaching is a deliberate act on this device,
a bundle is a default. Removing the attachment falls back to the bundle.

> ⚠️ **The Pages repo is public.** Anything in `pdf/` is world-readable at a guessable URL.
> Only bundle patterns this repo has the right to publish. A bought pattern — Lenore
> (Nevermore Pattern Club), Peacock Tee (Sandnes) — is attached on-device, never committed.

## Metadata syncs, bytes do not

This is the design, not an optimisation. Attaching on the phone tells the iPad a copy
exists within the minute — a few hundred bytes on the pull that was happening anyway. The
megabytes come down only when someone taps **Download** on a device that hasn't got them.

This PWA sits open for weeks. Pulling 8MB in the background per device, on mobile data, on
the off-chance someone wants to read it, is not a trade worth making.

Four states, and the sheet says which:

| state | meaning | what the sheet offers |
|---|---|---|
| `none` | nothing anywhere | Choose a PDF |
| `local` | here, not in the account yet | Open · Replace · Remove, "not backed up yet" |
| `synced` | same copy both places | Open · Replace · Remove, "backed up" |
| `remote-newer`, no local copy | the account has one this device hasn't | **Download to this device** |
| `remote-newer`, older copy here | both, and they differ | **Open this copy** · Get the newer copy · Use a different file |

## Feedback while it happens

`pdfActivity` in `js/cloud/pdfsync.js` tracks `{busy, failed}` per pattern. Every mutation
goes through `setPdfActivity`, which calls `refreshPdfSheet` — so an open sheet repaints
itself as an upload starts and finishes, and nobody has to close and reopen it to find out
whether the file made it.

It is **in-memory and never persisted**. "Uploading" is a fact about this page, this second;
a device that crashes mid-upload comes back with a queued op, not an upload in flight, and
the outbox already records that. Writing it to localStorage would strand a sheet on
"Uploading…" forever after a reload.

A **failed** upload shows an error and a **Try again** button. Before, it was
indistinguishable from "not backed up yet" — so a push that would never succeed sat there
claiming it was about to. The flag is a display fact only: the outbox still owns the retry
decision, and `pushPdf` records the failure and rethrows so `flush()` behaves as it always did.

There is **no percentage**. `supabase-js`'s storage client exposes no upload progress
events, so a real bar would mean replacing that call with a raw signed XHR — deliberately
not done.

## Where PDFs are visible

- **Section header** — the document icon, beside the notes book, on every section including
  the chart. It takes a **blue dot for `remote-newer` only**: the one state with something
  to do and no other trace on screen. Not for `local`, which resolves on the next flush; a
  dot that appears for two different reasons is a dot nobody reads.
- **Account sheet** — a collapsed "Pattern PDFs · N files · X MB" row, expanding to a
  per-pattern list, largest first, each with Remove. This is where someone clearing space
  goes, and it saves opening four projects to find the big one. Absent entirely when there
  are no attached files. Bundled PDFs are excluded — they ship with the app and are not the
  user's to delete, so listing them beside a Remove button would offer an action that
  cannot exist.

Both Remove buttons call `confirmRemovePatternPdfFrom(pat, after)`, so the "this takes it
off your other devices too" warning cannot drift between the two entry points.

## Schema

- `pattern_pdfs` — one row per `(owner_id, pattern_id)`: `file_name`, `byte_size`,
  `updated_ms` (client clock), `deleted_ms` (tombstone), `storage_path`.
- Bucket `pattern-pdfs` — **private**, 100MB limit, `application/pdf` only.
- Objects are keyed `<uid>/<patternId>.pdf`. The first path segment **is** the
  authorisation check: `(storage.foldername(name))[1] = auth.uid()::text`.

### Why a metadata table as well as the objects

Three things `storage.objects` cannot do on its own:

1. Answer "is there a newer copy than mine?" without a download.
2. Carry the original filename. The object is keyed by pattern id because that is what
   makes it addressable; `lenore-nevermore-2026.pdf` is what the user recognises.
3. Tombstone a delete. Removing the object leaves nothing to say it was removed, so the
   other device would upload its copy again — the same reason projects are soft-deleted.

### Why last-write-wins and no clock map

A PDF is one opaque blob. There are no fields to merge, so the per-field clocks and
three-way merge that progress needs would be machinery with nothing to do. Two devices
attaching different files for the same pattern is rare and cheap to be wrong about.

## RLS proof — 2026-08-14

Two fake users, one `pattern_pdfs` row and one storage object each.

| check | result |
|---|---|
| A: SELECT `pattern_pdfs` | 1 row (own only) |
| A: sees B's row | 0 |
| A: UPDATE B's row | 0 rows |
| A: DELETE B's row | 0 rows |
| A: INSERT owned by B | blocked by with-check |
| anon: SELECT `pattern_pdfs` | 0 rows |
| A: list bucket objects | 1 (own folder only) |
| A: read B's object | 0 |
| A: UPDATE B's object | 0 rows |
| A: write into B's folder | blocked by with-check |
| anon: list bucket objects | 0 |

All test rows, objects and users deleted afterwards; `pattern_pdfs` and the bucket are back
to 0 rows, and the 4 real projects / 4 progress rows were untouched throughout. Supabase's
security advisor reports no new findings (the one pre-existing warning, leaked-password
protection, is an auth setting unrelated to this change).

### Two things worth knowing about `storage.objects`

- **Direct `DELETE` is blocked** by a `protect_delete` trigger, for everyone, including the
  service role — "Use the Storage API instead". The escape hatch is
  `set local storage.allow_delete_query = 'true'`, which is how the test objects were
  cleaned up. Disabling the trigger is not possible; the MCP connection does not own the
  table.
- Rows inserted straight into `storage.objects` have no S3 object behind them. Fine for an
  RLS proof, useless for anything else.

## Client test coverage

Run in the browser against a mock server (the same approach as
`js/cloud/sync.pushpull.selftest.js`), all passing 2026-08-14:

- push → `done`, object uploaded, state `synced`
- push again → `drop`, no redundant re-upload
- idle pull → no change
- remote replaces the file → pull reports `remote-newer`
- download → correct filename and bytes, state `synced`
- push after download → `drop` (no upload loop)
- remove here → object deleted, row tombstoned, state `none`
- remote delete → local blob purged on the other device

Two bugs this caught, both fixed:

- `pdfTx` collapsed "transaction failed" and "succeeded, and the answer is nothing" into one
  value, so a **missing record read as a present one**. Now `PDF_FAIL` is a distinct
  sentinel and `pdfGet` returns `null` for a miss.
- `pushPdf` re-uploaded identical bytes whenever `remoteMs === localMs`, which every
  download produced — a download-then-upload loop. Now it drops.

## Not done

- **No upload percentage** — see above; it needs a raw signed XHR instead of `supabase-js`.
- **No quota handling for the Supabase free tier** (1GB storage). A family with a dozen
  patterns is nowhere near it; there is no banner if it is ever reached. The account
  sheet's total is the only number anyone can see.
- **No end-to-end run against live Supabase.** Sign-in is a magic link to the owner's
  email, which cannot be driven from a test. The client logic is covered by the mock above
  and the server by the SQL RLS proof; the untested seam is the real `supabase-js` storage
  calls against the live bucket. Worth one manual attach-on-phone / download-on-iPad pass.
