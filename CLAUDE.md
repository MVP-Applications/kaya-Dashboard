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
