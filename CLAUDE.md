# CLAUDE.md — Kaya Dashboard

Standing rules for this codebase. They take precedence over defaults; if a request conflicts
with one, follow this file and flag the conflict.

## Slugs

- Every slug that becomes a public address (treatments, doctors, verticals, categories, custom
  pages — and any new record with one) is lowercase letters and digits joined by single
  hyphens: `hair-spa`, never `Hair Spa`, `MakeUp` or `test_2`. Slugs are unique per record type.
- Use the shared helpers in `lib/admin/slug.js` — never a local `slugify` or a hand-written
  pattern:
  - `<SlugField>` (`components/admin/SlugField.js`) for the input. It cleans typing as it goes
    (lowercase, spaces → hyphens) and shows the slug generated from the name as the placeholder.
  - `resolveSlug(typed, name, takenSlugs)` on save. It returns the slug to save (the admin's own,
    or one generated from the name) and an error for a bad or duplicate one. Block the save on
    that error.
- Admins may override the generated slug (e.g. for SEO), but only within the rule.
- The rule is mirrored in kaya-nest-api `src/common/utils/slug.util.ts` (which rejects anything
  else) and kaya-website `app/not-found.js`. Change all three together.

## Navigation state lives in the URL

A refresh, a bookmark, a shared link or right-click → "Open in new tab" must land on exactly
the same screen.

- Every section is a route: `/` is Overview, every other section is `/<id>/` (trailing slash,
  matching `next.config.mjs`). Adding a section = add the id to `VIEW_IDS` in
  `lib/admin/routes.js`, the component to `components/admin/AdminView.js`, and the nav item to
  `AdminShell`.
- Everything else worth getting back goes in query params, through the hooks in
  `components/admin/useUrlState.js` — never `useState` alone:
  - open record: `?edit=<id>`, `?new=1`, `?open=<id>` (drawers, profiles)
  - tabs: `?tab=<id>`
  - filters and search: `useQueryParam(key)` / `useQueryText('q')`
  - pagination: `usePageParam()` (page 1 is left out); a filter change resets it
    (`resets: ['page']`)
- Anything that navigates — sidebar items, Edit / View / + New, cards, links between sections —
  is a `<Link href>` (`viewHref(view, params)` for another section, `href(patch)` from
  `useQuery()` for the current one), never `onClick={() => setX(...)}`. Use `scroll={false}` for
  drawers that open over a list.
- Opening a record is a Link (a push, so Back closes it). Filters, typing and closing a record
  use `set(patch)` (a replace, so Back isn't flooded).
- A URL can name a record that isn't loaded yet (fresh page load) or no longer exists — render
  `MissingRecord` (loading while `dataVersion === 0`), or fetch it by id, rather than silently
  showing the list.
- Stays local: confirm dialogs, unsaved form drafts, the EN/AR toggle inside a form, busy flags.
