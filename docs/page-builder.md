# Pages: data format

**For:** the website team and the backend team.
**Status:** live. Backend: `kaya-nest-api` `src/modules/pages` (templates in
`page-templates.ts`, block shapes in `section-types.ts`). Dashboard: **Pages**.
Website: `shared/context/PagesContext.js` (menus, availability),
`shared/hooks/usePageContent.js` (the site's own pages), `app/[slug]` → `features/custom-pages`
(built pages).

Every website page is one record:

- **The site's own pages** (`kind: SYSTEM`) — Homepage, About, Tell us, Treatments, Aesthetic,
  Wellness, Men's, Surgery, Doctors, Indulgence, Find us. Their layout and address are built into
  the website. Admins edit their copy, switch optional sections off, and set status, menu
  placement and countries.
- **Built pages** (`kind: CUSTOM`) — made in the dashboard from blocks, at `kaya.ae/<slug>`.

Publishing never needs a website rebuild: the website reads everything below at runtime.

---

## 1. Status, menus and countries

| Field | Values | Meaning |
|---|---|---|
| `status` | `DRAFT` · `PUBLISHED` · `ARCHIVED` | Only `PUBLISHED` pages exist for the public API and the website. The dashboard changes it only after the admin confirms a popup. |
| `headerPosition` / `headerOrder` | `NONE` · `LEFT` · `RIGHT` | Header link: `LEFT` = main menu, `RIGHT` = next to the language/account buttons. |
| `footerColumn` / `footerOrder` | `NONE` · `COMPANY` · `SUPPORT` | Footer link, after that column's own links. |
| `allCountries` / `countries` | `true`, or a list of countries | Not offered in the visitor's country → the website sends them to the homepage and hides the page's links. |

Locks: the homepage always stays published and offered everywhere. The site's own pages
can't be archived, deleted, renamed or moved to another template.

## 2. Endpoints

| Who | Method | Route | Purpose |
|---|---|---|---|
| Dashboard | `GET` | `/api/v1/admin/pages` | Every page with status, menus, countries, translations, sections and `missingLocales`. |
| Dashboard | `POST` | `/api/v1/admin/pages` | Create a built page (starts as `DRAFT`). |
| Dashboard | `PUT` | `/api/v1/admin/pages/:id` | Settings: slug, template, titles/menu label/SEO per language, menus, countries. |
| Dashboard | `PUT` | `/api/v1/admin/pages/:id/status` | `{ status }`. Publishing a built page checks its template's rules. |
| Dashboard | `PUT` | `/api/v1/admin/pages/:id/sections` | Site's own pages: listed sections updated (copy, `visible`). Built pages: the whole block list. With `countryId`: that country's own copy. |
| Dashboard | `PUT` | `/api/v1/admin/pages/navigation` | Menu placement and order of several pages. |
| Dashboard | `GET` | `/api/v1/admin/pages/overrides` | Every country's own copy, by country → page → section. |
| Dashboard | `DELETE` | `/api/v1/admin/pages/:id` | Delete a built page. |
| Dashboard | `POST` | `/api/v1/admin/media/upload` | Upload an image (staff login; JPEG/PNG/WebP/GIF/AVIF/SVG, ≤ 10 MB). |
| Website | `GET` | `/api/v1/public/pages` | Published pages: `{ slug, path, kind, navLabel: { EN, AR }, headerPosition, headerOrder, footerColumn, footerOrder, countries }` (`countries: null` = everywhere). |
| Website | `GET` | `/api/v1/public/pages/:slug?locale=&country=` | One published page in one language; 404 when not published or not offered in `country`. |

Staff can read; every change needs a super admin. Public responses are
cacheable for 60 s (`Cache-Control: public, max-age=60, stale-while-revalidate=300`), so a change
shows on the website within about a minute.

`/api/v1/public/custom-pages` and `/:slug` still answer in the old shape for one release, so a
website build from before this change keeps working. Remove them once the new website is live.

## 3. A public page

```jsonc
{
  "id": "…", "slug": "summer-glow", "name": "Summer Glow",
  "kind": "CUSTOM", "template": "campaign",
  "title": "Summer Glow",                        // in the requested language (English if missing)
  "seo": { "title": "Summer Glow | Kaya", "description": "" },   // empty = keep the site's default
  "sections": { "<key>": { "key", "name", "content" } },          // shown sections by key
  "hiddenSections": ["principles"],              // switched off — render nothing, not fallback copy
  "blocks": [ { "id": "blk-1", "type": "hero", "content": { … } } ]  // built pages only, in order
}
```

- **The site's own pages** keep reading `sections[key].content` field by field (see
  `kaya-nest-api/src/prisma/page-sections.data.ts`). A section missing in the requested language
  falls back to English. Image sections may carry `bgImageAlt` (alt text) and `bgImageFocus`
  (`"x% y%"`, used as `object-position`).
- **Built pages**: `content` is one language, with every empty field already filled from English.
- **A country's own copy** replaces a whole section in one language for visitors in that country.

## 4. Templates

| Template | Blocks allowed | Needs (visible) |
|---|---|---|
| `landing` | all | hero |
| `campaign` | hero, text, imageText, image, features, treatments, doctors, faq, cta, spacer | hero |
| `info` | hero, text, imageText, image, features, cta, spacer | — |
| `legal` | text, spacer | text |
| `faq` | hero, text, faq, cta, spacer | faq |
| `flexible` (Blank page) | all | — |

A page can't be published (or stay published) without an English title, at least one visible
block, and the blocks its template needs.

## 5. Blocks

Each block is a section: `key` = block id, `type`, `visible`, one content object per language.
Headings mark emphasis with `*asterisks*`. `buttonAction` is `link` (go to `buttonLink`),
`booking` (open booking) or `whatsapp`. An empty `buttonLabel` means no button.

| `type` | content fields | Image |
|---|---|---|
| `hero` | `eyebrow`, `heading`, `sub`, `image`, `imageAlt`, `imageFocus`, `align`, `buttonLabel`, `buttonAction`, `buttonLink` | min 460 px tall: ≈ 3:1 desktop, taller on phones — **2400 × 900**, set the focal point |
| `text` | `heading`, `body` (paragraphs split by a blank line) | — |
| `imageText` | `image`, `imageAlt`, `imageFocus`, `imageSide`, `eyebrow`, `heading`, `body`, button fields | fixed 4:3 — **1600 × 1200** |
| `image` | `image`, `alt`, `caption`, `width` (`contained` · `full`) | never cropped — ≥ 1600 px wide (2400 full width) |
| `features` | `heading`, `sub`, `items[] { icon, title, text }` | — |
| `treatments` | `heading`, `sub`, `treatments[]` (ids; missing ones skipped) | from the treatment |
| `doctors` | `heading`, `sub`, `doctors[]` (ids) | from the doctor |
| `faq` | `heading`, `items[] { question, answer }` | — |
| `cta` | `heading`, `sub`, button fields | — |
| `spacer` | `size` (`small` · `large` · `line`) | — |

Unknown fields are rejected, and images must be uploaded URLs (never inline `data:`).
Unknown block types are skipped by the website.

## 6. Reserved addresses

A built page can't use the site's own routes or common reserved words — `RESERVED_SLUGS` in
`kaya-nest-api/src/modules/pages/page-templates.ts` and `features/pages/lib/page-builder.js`.
**If the website adds a route, add it to both lists.**
