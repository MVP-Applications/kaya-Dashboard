# Kaya CMS — setup

The dashboard is backed by [kaya-nest-api](../kaya-nest-api) (NestJS +
PostgreSQL + Prisma + Redis). This is a migration in progress: **login is
connected to the real backend**; the catalogue, page content and users
screens are being wired up one at a time and currently show a clear "not
connected yet" message instead of live data.

---

## Looking around first (no setup)

```bash
npm install && npm run dev
```

Open <http://localhost:1000> and pick one of the sample accounts.

With no backend configured the dashboard runs in **preview mode** — the real
site content is loaded into your browser's storage and every screen works:
creating, editing, deleting, reordering, filtering, the enquiry inbox, roles.
It's labelled *Preview mode* in the topbar, and "Reset sample data" in the
sidebar puts everything back.

Sign in as the **Content Editor** to see permissions in action: delete buttons
disappear, because that role can't delete.

Nothing in preview mode touches a real backend. The rest of this guide
connects it to `kaya-nest-api`.

---

## 1. Run kaya-nest-api

Follow that project's own setup (Postgres, Redis, Prisma migrate, `npm run
start:dev`). This dashboard doesn't provision or manage that backend — it
only calls it.

Two things on the backend side matter for this dashboard specifically:

- **CORS**: its `CORS_ORIGINS` env var must include this dashboard's origin
  (e.g. `http://localhost:1000` in dev), or the browser will refuse the
  login request.
- **A staff account**: create one directly against the backend (its own
  `POST /admin/staff-users`, or however its setup docs describe it) — this
  dashboard has no way to create the first account itself.

## 2. Point the dashboard at it

```bash
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_BASE_URL
npm run dev
```

Open <http://localhost:1000> and sign in with the account you created in
step 1.

---

## What works today

| Area | Status |
|---|---|
| Sign in / sign out / session | Connected to `kaya-nest-api` |
| Services, Doctors, Reviews, Vouchers, Locations | Not connected yet — screen shows an error banner |
| Pages, Footer & Global | Not connected yet |
| Enquiry inbox (Requests) | Not connected yet; no realtime push exists on the backend either — this will need polling or a new backend endpoint when it's integrated |
| Users & Roles | Not connected yet — the backend also has no way to edit or delete a staff account once created |
| Publish to site | Not connected — no backend endpoint for triggering a rebuild exists yet |

Each of the above gets wired up individually; `lib/api/endpoints.js` already
lists every route `kaya-nest-api` exposes for when that happens.

---

## Everyday commands

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server on :1000 |
| `npm run build` | Build and export to `out/` |

---

## Where things live

| Path | What |
|---|---|
| `lib/api/client.js` | The one place that calls `fetch()` against the backend — envelope unwrapping, auth header, 401 → refresh → retry |
| `lib/api/endpoints.js` | Every backend route, centralized |
| `lib/api/config.js` | `NEXT_PUBLIC_API_BASE_URL` / whether the backend is configured |
| `lib/api/token.js` | In-memory access-token holder |
| `lib/admin/store.js` | Picks the API backend or the preview backend |
| `lib/admin/store-api.js` | The API backend — auth aside, every function is a "not connected yet" stub until integrated |
| `lib/admin/auth.js` | Sign-in, session, roles |
| `lib/seed-data/` | The original hardcoded content — backs preview mode |

---

## Troubleshooting

**The dashboard still says "Preview mode" after adding `.env.local`.**
`NEXT_PUBLIC_API_BASE_URL` is missing, or the dev server wasn't restarted —
Next only reads env files at startup, and `NEXT_PUBLIC_*` values are baked in
at build time.

**Login fails with a network error.**
Check the backend's `CORS_ORIGINS` includes this dashboard's origin, and that
`NEXT_PUBLIC_API_BASE_URL` points at a reachable instance.

**"Invalid email or password".**
The account doesn't exist on the backend, or the password is wrong — create
one directly against `kaya-nest-api` (see step 1).

**A screen says "isn't connected to the new backend yet."**
Expected for now — that feature hasn't been integrated. See "What works
today" above.

---

## What this does not cover

The public website is a separate project and reads its content at *build*
time, not from this dashboard directly. See
[docs/connecting-the-website.md](docs/connecting-the-website.md) — note that
doc currently describes that project's own (pre-migration) Supabase wiring
and is flagged there as stale pending its own migration.
