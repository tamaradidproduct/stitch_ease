# Backing up and restoring progress

Progress lives only in the browser's `localStorage`, under the `pt3_` prefix. There is no
server copy. Clear the site data and it is gone; a migration that goes wrong on a phone has
nothing to roll back to.

So before deploying anything that changes stored data — a new migration, a change to what
`save()` writes — take a backup on each device that has real progress.

Both snippets below have been round-trip tested: back up, corrupt the data, restore, verify
byte-identical.

## Back up

Open the app, then in the browser console:

```js
copy(JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('pt3_')))))
```

That puts the whole backup on the clipboard — paste it somewhere safe (a note, an email to
yourself). It is a few KB of JSON.

`copy()` is a devtools convenience and only exists in the console. If it is unavailable,
drop the `copy(...)` wrapper and select the printed string instead.

## Restore

Paste the backup between the backticks on the first line, then run the whole block:

```js
(() => {
  const BACKUP = `PASTE_BACKUP_HERE`;

  let data;
  try { data = JSON.parse(BACKUP); } catch (e) { return 'Not valid JSON — paste the whole backup, braces included.'; }
  const keys = Object.keys(data || {});
  if (!keys.length) return 'Backup is empty — nothing restored.';
  if (!keys.every(k => k.startsWith('pt3_'))) return 'That is not a Stitch Ease backup — nothing restored.';
  if (!keys.some(k => k === 'pt3_projects' || k === 'pt3_state')) return 'No projects in that backup — nothing restored.';

  // What is about to be replaced, logged rather than dropped, in case the
  // restore itself was the mistake.
  const displaced = Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('pt3_')));
  console.info('[restore] replacing current data; copy this if you want it back:', JSON.stringify(displaced));

  // Clear first, don't merge. Restoring over a half-migrated state would leave
  // keys from both, which is a shape no version of the app ever writes.
  Object.keys(displaced).forEach(k => localStorage.removeItem(k));
  keys.forEach(k => localStorage.setItem(k, data[k]));

  location.reload();
})()
```

It refuses rather than wipes on a bad paste — truncated JSON, an empty object, someone
else's data, or `pt3_` keys with no projects in them all stop with a message and change
nothing.

### What restoring does to migrations

Migrations are gated on sentinels that live in the same `pt3_` space, so they come back
with everything else:

- A backup taken **before** a migration has no `pt3_schema`, so restoring it makes
  `migrateAddClocks()` run again on next load. That is what you want — the restore has put
  the data back in its pre-migration shape.
- A backup taken **after** carries the sentinel, so nothing re-runs.

Either way the restored state is self-consistent. Do not hand-edit the sentinel.

## Notes

- Backups are per-device and per-origin. The deployed app
  (`tamaradidproduct.github.io/stitch_ease/`) and a local dev server are separate storage;
  a backup from one will not appear in the other, though it can be restored into it.
- Private browsing can refuse writes entirely. If the app shows "Progress isn't being
  saved on this device", a restore will not stick either.
