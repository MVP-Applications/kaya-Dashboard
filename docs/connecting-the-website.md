# Connecting the public website to this dashboard

> **Stale.** This dashboard no longer uses Supabase — see the top-level
> README/SETUP for the current (kaya-nest-api-backed) setup. Everything
> below describes the **separate public-website project**'s own Supabase
> integration, which is outside this repo and hasn't been migrated as part
> of that change. Treat the mechanism (Supabase client, `supabase/functions/publish`,
> `NEXT_PUBLIC_SUPABASE_*`) as historical until that project's own migration
> happens; the shape of the problem it solves — enquiries in, content out,
> a publish trigger — still applies.

This project is the **dashboard only**. The public Kaya site lives separately in
`../Kaya Website`. Two pieces of wiring connect them, and both belong in the
*website* project, not this one.

Keep this file — it is the record of what the website needs.

---

## 1. Enquiries: the booking form must write to Supabase

Today the website's booking form does not send anywhere that this dashboard can
read. Until it does, the Requests inbox will only ever show sample data.

In `app/booking/BookPageClient.js` of the **website** project:

**Install the client**

```bash
npm install @supabase/supabase-js
```

**Add a Supabase client** — copy `lib/supabase/client.js` from this project.

**Add a submit helper** (the website only needs to insert, never read back):

```js
import { getSupabase } from '@/lib/supabase/client'

/**
 * Record an enquiry. `status` and `notes` are forced rather than taken from the
 * caller — the insert policy only accepts a genuinely new enquiry with empty
 * staff notes. Returns { ok } instead of throwing: a failed enquiry must not
 * break the booking UI.
 */
export async function submitRequest(record) {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' }

  const { error } = await supabase.from('requests').insert({
    source: record.source || 'consultation',
    status: 'new',
    notes: '',
    name: record.name || '',
    mobile: record.mobile || '',
    email: record.email || '',
    gender: record.gender || '',
    country: record.country || '',
    city: record.city || '',
    treatment_area: record.treatmentArea || '',
    treatment: record.treatment || '',
    doctor: record.doctor || '',
    concerns: record.concerns || [],
    message: record.message || '',
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
```

**Call it from the form.** The important part is that a failed submission is
surfaced rather than swallowed — a dropped enquiry is a lost patient, so the
form must not show a confirmation for something that never arrived:

```js
const res = await submitRequest({ /* … form fields … */ })

if (!res.ok) {
  setSubmitError('We could not send your request. Please try again, or call us directly.')
  return
}
setDone(true)
```

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are needed
on the website. Never put the service-role key there.

---

## 2. Content: the website must build from the database

Once editors change treatments or doctors in the dashboard, the website has to
pick those changes up. The website is a static export, so it cannot query
Supabase at request time — it reads the database at **build** time instead.

Copy these from this project into the website:

| File | Does |
|---|---|
| `scripts/snapshot.mjs` | Reads the catalogue from Supabase, writes `lib/generated/` |
| `scripts/env.mjs` | Loads `.env.local` for those scripts |
| `lib/taxonomy.js` | The four treatment categories |

Then in the website's `package.json`:

```json
"predev": "npm run snapshot",
"prebuild": "npm run snapshot",
"snapshot": "node scripts/snapshot.mjs"
```

And turn the website's `lib/services.js`, `doctors.js`, `reviews.js` and
`vouchers.js` into thin re-exports of `lib/generated/…`, moving the current
hardcoded content to `lib/seed-data/` as the offline fallback. This project's
versions of those files are the working reference.

**Add the build secrets** to the website's deploy (GitHub Actions →
Settings → Secrets): `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Without them the snapshot silently falls back
to the hardcoded content and would deploy stale copy as though it were live —
so fail the build when they are missing rather than allowing that.

---

## 3. Publishing

The dashboard's **Publish** button triggers a rebuild of the website. It calls
the `supabase/functions/publish` Edge Function in this project, which dispatches
the website repo's deploy workflow. Point `GITHUB_REPO` at the **website**
repository, not this one:

```bash
supabase secrets set GITHUB_TOKEN=ghp_xxx GITHUB_REPO=owner/kaya-website
```

---

## Field mapping

Two names differ between the dashboard and the site, handled at snapshot time —
worth knowing if you touch the mapping:

| Database | Website expects | Note |
|---|---|---|
| `vouchers.type` | `category` | Straight rename |
| — | `reviews.category` | Derived from the treatment the review names |
| — | `services.tag` | Derived from `services.category`, so the label and the page it routes to can never disagree |
