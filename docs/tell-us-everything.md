# Tell Us Everything: data format

**For:** the website team (the concern finder at `/tell-us`) and the backend team.
**Status:** live. The backend serves and stores the document
(`kaya-nest-api` `src/modules/tell-us`), the dashboard edits it (Tell Us
Everything screen), and the website's `/tell-us` renders it
(`components/ConcernFinder.js`). Nothing about the questionnaire is
hard-coded on the website any more.

Until an admin first saves, the backend serves a **default** built from what
the website used to hard-code (gender, age, a concern list per pillar, Mens
skipping gender), with pillar and treatment slugs resolved to this database's
ids. So switching over changes nothing visible.

---

## 1. Endpoints

| Who | Method | Route | Body |
|---|---|---|---|
| Dashboard | `GET` | `/api/v1/admin/tell-us` | returns the document |
| Dashboard | `PUT` | `/api/v1/admin/tell-us` | the whole document |
| Website | `GET` | `/api/v1/public/tell-us` | returns the document |

Set in `shared/lib/api/endpoints.js` under `tellUs` in both the dashboard and the
website. It is one document, saved whole, like Footer and Global. There is no
list and no pagination. The admin routes need a staff login (STAFF or ADMIN);
the public route is open and carries both languages, so it takes no locale.

The backend **prunes stale references** on save and on read instead of
rejecting them: areas for deleted pillars, links to deleted treatments, and
steps pointing at a deleted shared question are dropped.

---

## 2. The document

```jsonc
{
  "version": 1,

  // Questions written once and reused by every main treatment.
  "shared": [
    {
      "id": "gender",
      "eyebrow": "A little more about you",  "eyebrowAr": "المزيد عنك",
      "heading": "What is your *gender*?",   "headingAr": "ما هو *جنسك*؟",
      "sub": "This helps us tailor treatments to your specific needs.",
      "subAr": "يساعدنا هذا على تخصيص العلاجات وفق احتياجاتك.",
      "multiple": false,
      "options": [
        { "id": "female", "label": "Female", "labelAr": "أنثى", "treatments": [] },
        { "id": "male",   "label": "Male",   "labelAr": "ذكر",  "treatments": [] }
      ],
      "notSure": false, "notSureLabel": "", "notSureLabelAr": ""
    }
    // …"age" and any others the admin adds
  ],

  // Per main treatment: the steps asked after someone picks it, in order.
  "areas": {
    "<pillar id of Hair>": {
      "steps": [
        { "id": "hair-gender",   "shared": "gender", "enabled": true },
        { "id": "hair-age",      "shared": "age",    "enabled": true },
        {
          "id": "hair-concerns",
          "enabled": true,
          "question": {
            "id": "concerns-hair",
            "eyebrow": "Refine your concerns", "eyebrowAr": "حدد اهتماماتك",
            "heading": "What specifically *bothers* you?", "headingAr": "ما الذي *يزعجك* تحديدًا؟",
            "sub": "Select one or more concerns — …", "subAr": "…",
            "multiple": true,
            "options": [
              { "id": "thinning", "label": "Thinning Hair", "labelAr": "ترقق الشعر", "treatments": ["<treatment id of PRP Hair>"] },
              { "id": "unwanted", "label": "Unwanted Hair Removal", "labelAr": "…", "treatments": ["<treatment id of Laser Hair Removal>"] }
            ],
            "notSure": true, "notSureLabel": "Not sure — show all", "notSureLabelAr": "لست متأكدًا — عرض الكل"
          }
        }
      ]
    },
    "<pillar id of Mens>": {
      "steps": [
        { "id": "mens-gender", "shared": "gender", "enabled": false },  // Mens skips gender
        { "id": "mens-age",    "shared": "age",    "enabled": true }
        // …its own concern question
      ]
    }
    // …one entry per main treatment
  }
}
```

### Field reference

**Question** (in `shared[]`, or as `step.question`):

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable id. Also sent back with the enquiry (section 4). |
| `eyebrow` / `eyebrowAr` | string | Small label above the heading. May be empty. |
| `heading` / `headingAr` | string | The question. Words wrapped in `*asterisks*` are the emphasised part (the `<em>` in today's markup). The emphasis can sit anywhere, because Arabic word order differs. |
| `sub` / `subAr` | string | Line under the heading. May be empty. |
| `multiple` | boolean | `false` means pick one, like gender or age. `true` means pick several, like concerns. |
| `options[]` | array | The answers, in display order. |
| `notSure` | boolean | Show an extra "not sure" answer after the options. Only used on a main treatment's own questions. |
| `notSureLabel` / `notSureLabelAr` | string | That answer's text. |

**Option:**

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable id, unique within its question. |
| `label` / `labelAr` | string | Button text. |
| `treatments` | string[] | Treatment **ids** this answer suggests. Always `[]` on shared questions. |

**Step** (in `areas[areaId].steps[]`). Each step has exactly one of `shared` or `question`:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable id of the step. |
| `shared` | string | The `id` of a question in `shared[]`. |
| `question` | object | A question that belongs only to this main treatment. |
| `enabled` | boolean | `false` means skip this step for this main treatment. |

**Area keys** are the pillar's backend **id** (Pillar.id, a cuid) — never the
slug, so renaming a pillar doesn't break the questionnaire. The website matches
them to `/public/pillars` items by `id`. In the dashboard, a vertical's key is
`v.backendId` (preview mode, which has no backend, uses `v.id`) — see
`areaKey` in `shared/lib/tell-us.js`.

**Arabic:** the `…Ar` fields may be empty. In that case, fall back to the English value.

---

## 3. How the website should use it

After someone picks a main treatment `areaId`:

1. **Questions to ask:** take `areas[areaId].steps`, keep only `enabled: true`,
   and keep their order. For a `shared` step, use the question from `shared[]`
   with that id. For a `question` step, use it directly. Ask them one after
   another, as today. If there are no steps, go straight to the results.
2. **Suggested treatments:** this is the same rule the website uses today.
   - Gather the `treatments` ids of every option the person picked in the
     area's **own** questions (the `question` steps). Shared answers never
     affect results.
   - Keep only treatments that belong to the chosen main treatment (a
     treatment belongs when its `pillars` include the area's pillar id).
   - Show those. If the person picked "not sure", or nothing they picked links
     to a treatment in this main treatment, show **every** treatment in the
     main treatment.
3. **Showing the results:** show the results once the last question has been
   answered, the same as today's concern step.

The dashboard's "Try it" panel runs this exact rule (`suggestTreatments` in
`shared/lib/tell-us.js`), so the website and the dashboard preview agree.

**Edge cases to handle:**
- A `shared` step whose id isn't in `shared[]`: skip it. The dashboard never saves one, but don't crash.
- A linked treatment id that no longer exists: ignore it.
- An area with no entry in `areas`: ask nothing and show every treatment in it.

---

## 4. Sending the answers with the enquiry

When someone books from Tell Us Everything, add an `answers` array to the
enquiry (lead) you already send. Record the **text the person saw**, in the
language they used, so the enquiry still reads correctly after an admin edits
the questions:

```json
"answers": [
  { "questionId": "gender",        "question": "What is your gender?",           "answers": ["Female"] },
  { "questionId": "age",           "question": "Which age range are you in?",    "answers": ["In your 30's"] },
  { "questionId": "concerns-hair", "question": "What specifically bothers you?", "answers": ["Thinning Hair"] }
]
```

- `question` is the heading with its asterisks removed.
- `answers` holds the option labels picked. For "not sure", send its label.
- Keep sending `treatmentArea` and `concerns` as today. The dashboard still shows them.

The backend stores `answers` on the lead as sent (`Lead.answers`, JSON),
returns it on `GET /admin/leads`, and includes it in the CSV export. The
dashboard shows it on the enquiry under "Tell Us Everything answers".
