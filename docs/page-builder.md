# Page builder: data format

**For:** the website team and the backend team.
**Status:** built in the dashboard and working in preview mode. There are no
backend endpoints yet, so the dashboard's client is switched off
(`PAGE_BUILDER_API_READY` in `lib/admin/store-api.js`). The existing, connected
pages module (`/admin/pages`, `/admin/pages/:id/sections`) is **unchanged**.
Everything here is new and separate.

The dashboard now offers two things:

1. **Custom pages:** admins create pages from blocks, at top-level addresses such as `kaya.ae/summer-glow`.
2. **Show or hide the website's own pages:** any fixed page except Home can be hidden.

---

## 1. Endpoints

| Who | Method | Route | Purpose |
|---|---|---|---|
| Dashboard | `GET` | `/api/v1/admin/custom-pages` | List every custom page, hidden ones included. Paginated like other admin lists (`?page=&pageSize=`, `meta.pagination.total`). |
| Dashboard | `POST` | `/api/v1/admin/custom-pages` | Create one. Returns it with its `id`. |
| Dashboard | `PUT` | `/api/v1/admin/custom-pages/:id` | Replace one. |
| Dashboard | `DELETE` | `/api/v1/admin/custom-pages/:id` | Delete one. |
| Website | `GET` | `/api/v1/public/custom-pages/:slug` | One **visible** page by slug. Return 404 if it's hidden or doesn't exist. |
| Dashboard | `GET` / `PUT` | `/api/v1/admin/pages-visibility` | The hidden map for fixed pages (section 5). |

These routes are proposals, also set in `lib/api/endpoints.js` under
`customPages`. The backend may fold them into the existing pages module
instead. If so, change the routes there and the dashboard follows.

Images arrive already uploaded through `/public/media/upload`, the same as
every other form. A page's image fields hold URLs.

---

## 2. A custom page

```jsonc
{
  "id": "summer-glow",            // backend id once saved
  "slug": "summer-glow",          // the address: kaya.ae/summer-glow
  "template": "campaign",         // which page type it started from — informational only
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
  (`RESERVED_SLUGS` in `lib/admin/page-builder.js`): `about`, `aesthetic`,
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
| `treatments` | `heading`\*, `sub`\*, `treatments[]`: treatment slugs in display order. Render them as the site's treatment cards, linking to each treatment page. Skip slugs that no longer exist. |
| `doctors` | `heading`\*, `sub`\*, `doctors[]`: doctor slugs in display order. Render them as the site's doctor cards, linking to `/doctors/:slug`. Skip missing ones. |
| `faq` | `heading`\*, `items[]` of `{ question*, answer* }`. Render as an accordion. |
| `cta` | `heading`\*, `sub`\*, `buttonLabel`\*, `buttonAction`, `buttonLink`. Render as the site's closing call-to-action band. |
| `spacer` | `size`: `small` (≈24px), `large` (≈72px) or `line` (a divider rule) |

\* localised: also has an `…Ar` twin.

For how each block should look, open **Pages → Summer Glow** in the dashboard.
Its preview is a close guide to layout and hierarchy (`components/admin/PagePreview.js`).
It isn't pixel-exact: use the site's own components and styles.

---

## 4. Serving custom pages on the website

- Add a top-level dynamic route, like `app/[slug]/page.js`. Next.js tries the site's own routes first, so they always win.
- Fetch `/public/custom-pages/:slug`. On a 404, show the normal not-found page.
- Send `seoTitle` / `seoDescription`, with the fallbacks above, as the page metadata.
- Leave custom pages out of the header menu. Admins link to them from Footer & Global or from other pages.
- If the site builds a sitemap, include only visible custom pages.

---

## 5. Hiding the website's own pages

`GET /admin/pages-visibility` returns a map with one entry per **hidden**
fixed page. A page that isn't listed is visible:

```json
{ "indulgencePage": false }
```

The keys are the dashboard's fixed-page ids, from `PAGES` in `lib/admin/content.js`:

| Key | Path |
|---|---|
| `home` | `/`, **never hidden**. The dashboard doesn't allow it. |
| `about` | `/about` |
| `treatments` | `/treatments` |
| `aesthetic` | `/aesthetic` |
| `wellness` | `/wellness-longevity` |
| `mens` | `/mens` |
| `surgery` | `/surgery` |
| `doctorsPage` | `/doctors` |
| `indulgencePage` | `/indulgence` |
| `tellUsPage` | `/tell-us` |
| `findUsPage` | `/find-us` |

The backend may prefer an `isVisible` column on its existing page records,
keyed by slug. That works too: map it in `fetchPageVisibility` /
`persistPageVisibility`. For the website, it needs a public way to read the
same flags, for example a field on `/public/pages/:slug`.

When a fixed page is hidden, the website should:
- return its normal not-found page for that path;
- remove links to it from the header, footer and any promo blocks that point
  there, such as the home page's Tell Us Everything banner;
- leave it out of the sitemap.

Its child pages are a product decision to confirm with the business. For
example, hiding `/doctors` could also hide `/doctors/:slug`. The dashboard
only stores the flag.
