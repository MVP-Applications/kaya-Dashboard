# Page builder: data format

**For:** the website team and the backend team.
**Status:** live. Backend: `kaya-nest-api` `src/modules/custom-pages`.
Dashboard: Pages → Your pages. Website: `app/[slug]` renders a page, and the
header shows each visible page's link on the side the admin chose.

Admins create pages from blocks, at top-level addresses such as
`kaya.ae/summer-glow`. When creating one they must pick **Position in the
website menu**: **Left** (in the main menu, next to Treatments, Doctors,
About…) or **Right** (next to the language and account buttons). The website's
own pages (Homepage, About…) stay in "Website pages", where their copy is edited.

---

## 1. Endpoints

| Who | Method | Route | Purpose |
|---|---|---|---|
| Dashboard | `GET` | `/api/v1/admin/custom-pages` | List every custom page, hidden ones included. Paginated like other admin lists (`?page=&pageSize=`, `meta.pagination.total`). |
| Dashboard | `POST` | `/api/v1/admin/custom-pages` | Create one. Returns it with its `id`. |
| Dashboard | `PUT` | `/api/v1/admin/custom-pages/:id` | Replace one. |
| Dashboard | `DELETE` | `/api/v1/admin/custom-pages/:id` | Delete one. |
| Website | `GET` | `/api/v1/public/custom-pages` | Header links for every **visible** page: `[{ slug, title, titleAr, navPosition }]`, oldest first. |
| Website | `GET` | `/api/v1/public/custom-pages/:slug` | One **visible** page by slug, hidden blocks removed. 404 if it's hidden or doesn't exist. |

Set in `shared/lib/api/endpoints.js` under `customPages` in the dashboard and the
website. Admin routes need a staff login; deleting needs ADMIN. The backend
validates every block's `data` against its type, rejects unknown fields, and
refuses reserved addresses and slugs already in use.

Images arrive already uploaded through `/public/media/upload`, the same as
every other form. A page's image fields hold URLs.

---

## 2. A custom page

```jsonc
{
  "id": "summer-glow",            // backend id once saved
  "slug": "summer-glow",          // the address: kaya.ae/summer-glow
  "template": "campaign",         // which page type it started from — informational only
  "navPosition": "LEFT",          // LEFT | RIGHT — which side of the header menu its link goes
  "visible": true,                // false → the website must not serve it
  "title": "Summer Glow",         "titleAr": "توهج الصيف",
  "seoTitle": "Summer Glow offer | Kaya",  "seoTitleAr": "",
  "seoDescription": "20% off laser resurfacing…", "seoDescriptionAr": "",
  "updatedAt": "2026-09-10T09:00:00.000Z",
  "blocks": [
    { "id": "blk-1", "type": "hero", "hidden": false, "data": { /* see section 3 */ } }
  ]
}
```

- **`slug`** is lowercase `a-z`, `0-9` and `-`, and unique among custom pages.
  The dashboard refuses the website's own routes and common reserved words
  (`RESERVED_SLUGS` in `features/pages/lib/page-builder.js`): `about`, `aesthetic`,
  `blog`, `blogs`, `booking`, `doctors`, `find-us`, `indulgence`, `login`,
  `mens`, `profile`, `surgery`, `tell-us`, `treatments`, `wellness-longevity`,
  `api`, `admin`, `app`, `assets`, `static`, `public`, `search`, `sitemap`,
  `robots`, `favicon`, `manifest`, `404`, `500`, `ar`, `en`.
  **If the website adds a new route, add it to that list too.** The backend
  should enforce the same uniqueness.
- **`template`** is one of `landing`, `campaign`, `info`, `legal`, `faq` or
  `blank`. It only records which starting blocks were used. Rendering depends on the blocks alone.
- **Arabic:** any `…Ar` field may be empty. In that case, fall back to the English value.
- **SEO:** if `seoTitle` is empty, use `title`. If `seoDescription` is empty, leave the meta description out.

---

## 3. Blocks

Every block is `{ id, type, hidden, data }`.
- **Skip blocks with `hidden: true`.**
- **Render blocks in array order.**
- **Skip unknown `type`s** without failing, so older sites keep working if new block types appear.

Localised fields store English under the key and Arabic under `<key>Ar`.
**Headings** mark emphasised words with `*asterisks*`, like `"Your summer *glow*"`.
Render the emphasised part as `<em>`, the same way the site's existing headings work.

**Buttons:** `buttonAction` is one of:
- `link` → go to `buttonLink`, either a site path or a full URL
- `booking` → open the booking modal, the same as other "Book" buttons
- `whatsapp` → open WhatsApp, using `resolveContact` as the concern finder does

An empty `buttonLabel` means no button.

| `type` | `data` fields |
|---|---|
| `hero` | `eyebrow`\*, `heading`\*, `sub`\*, `image` (background, optional), `align` (`left` \| `center`), `buttonLabel`\*, `buttonAction`, `buttonLink` |
| `text` | `heading`\*, `body`\*: paragraphs separated by a blank line |
| `imageText` | `image`, `imageSide` (`left` \| `right`), `eyebrow`\*, `heading`\*, `body`\*, `buttonLabel`\*, `buttonAction`, `buttonLink` |
| `image` | `image`, `caption`\*, `width` (`contained` \| `full`) |
| `features` | `heading`\*, `sub`\*, `items[]` of `{ icon, title*, text* }`. `icon` is a short symbol or emoji. |
| `treatments` | `heading`\*, `sub`\*, `treatments[]`: treatment **ids** in display order. Render them as the site's treatment cards, linking to each treatment page. Skip ids that no longer exist. |
| `doctors` | `heading`\*, `sub`\*, `doctors[]`: doctor **ids** in display order. Render them as the site's doctor cards, linking to `/doctors/:slug`. Skip missing ones. |
| `faq` | `heading`\*, `items[]` of `{ question*, answer* }`. Render as an accordion. |
| `cta` | `heading`\*, `sub`\*, `buttonLabel`\*, `buttonAction`, `buttonLink`. Render as the site's closing call-to-action band. |
| `spacer` | `size`: `small` (≈24px), `large` (≈72px) or `line` (a divider rule) |

\* localised: also has an `…Ar` twin.

For how each block should look, open **Pages → Summer Glow** in the dashboard.
Its preview is a close guide to layout and hierarchy (`features/pages/components/PagePreview.js`).
It isn't pixel-exact: use the site's own components and styles.

---

## 4. Serving custom pages on the website

- Add a top-level dynamic route, like `app/[slug]/page.js`. Next.js tries the site's own routes first, so they always win.
- Fetch `/public/custom-pages/:slug`. On a 404, show the normal not-found page.
- Send `seoTitle` / `seoDescription`, with the fallbacks above, as the page metadata.
- **Header menu:** fetch `/public/custom-pages` and add each page's link on
  its `navPosition` side — `LEFT` after the main menu links, `RIGHT` before the
  language and account buttons — and in the mobile menu. Use `titleAr` in
  Arabic when it's filled, else `title`.
- If the site builds a sitemap, include only visible custom pages.

---
