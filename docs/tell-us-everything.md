# Tell Us Everything: data format

**For:** the website team (the concern finder at `/tell-us`) and the backend team.
**Status:** the dashboard editor is built and works in preview mode. There is no
backend endpoint yet, so the website should keep its current hard-coded flow
until one exists, then switch to reading this document.

Today the website hard-codes the whole flow in `components/ConcernFinder.js`:
gender, then age, then a concern list per pillar, with Mens skipping gender in
code. The dashboard now manages all of this. The document below replaces
`AREA_CONCERNS_EN`, `AREA_CONCERNS_AR`, the gender and age steps, and the
`isMensArea` rule.

The dashboard's starting content is an exact copy of what the website hard-codes
today, so switching over should change nothing visible.

---

## 1. Endpoints

| Who | Method | Route | Body |
|---|---|---|---|
| Dashboard | `GET` | `/api/v1/admin/tell-us` | returns the document |
| Dashboard | `PUT` | `/api/v1/admin/tell-us` | the whole document |
| Website | `GET` | `/api/v1/public/tell-us` | returns the document |

These are proposed names, also set in the dashboard's `lib/api/endpoints.js`
under `tellUs`. The backend team may rename them. It is one document, saved
whole, like Footer and Global. There is no list and no pagination.

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
    "hair": {
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
              { "id": "thinning", "label": "Thinning Hair", "labelAr": "ترقق الشعر", "treatments": ["prp-hair"] },
              { "id": "unwanted", "label": "Unwanted Hair Removal", "labelAr": "…", "treatments": ["laser-hair-removal"] }
            ],
            "notSure": true, "notSureLabel": "Not sure — show all", "notSureLabelAr": "لست متأكدًا — عرض الكل"
          }
        }
      ]
    },
    "mens": {
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
| `treatments` | string[] | Treatment slugs this answer suggests. Always `[]` on shared questions. |

**Step** (in `areas[areaId].steps[]`). Each step has exactly one of `shared` or `question`:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable id of the step. |
| `shared` | string | The `id` of a question in `shared[]`. |
| `question` | object | A question that belongs only to this main treatment. |
| `enabled` | boolean | `false` means skip this step for this main treatment. |

**Area keys** are the main treatment (pillar) identifiers. The backend team
decides the final naming. The website currently uses pillar slugs
(`face-and-skin`, `body-contouring`, `energy-and-wellness`, …) and the
dashboard's preview uses vertical ids (`face-skin`, `body`, `wellness`, …).
Whatever the backend settles on, the keys here must match the pillar the
website shows in step 1.

**Arabic:** the `…Ar` fields may be empty. In that case, fall back to the English value.

---

## 3. How the website should use it

After someone picks a main treatment `areaId`:

1. **Questions to ask:** take `areas[areaId].steps`, keep only `enabled: true`,
   and keep their order. For a `shared` step, use the question from `shared[]`
   with that id. For a `question` step, use it directly. Ask them one after
   another, as today. If there are no steps, go straight to the results.
2. **Suggested treatments:** this is the same rule the website uses today.
   - Gather the `treatments` slugs of every option the person picked in the
     area's **own** questions (the `question` steps). Shared answers never
     affect results.
   - Keep only treatments that belong to the chosen main treatment.
   - Show those. If the person picked "not sure", or nothing they picked links
     to a treatment in this main treatment, show **every** treatment in the
     main treatment.
3. **Showing the results:** show the results once the last question has been
   answered, the same as today's concern step.

The dashboard's "Try it" panel runs this exact rule (`suggestTreatments` in
`lib/admin/tell-us.js`), so the website and the dashboard preview agree.

**Edge cases to handle:**
- A `shared` step whose id isn't in `shared[]`: skip it. The dashboard never saves one, but don't crash.
- A linked slug that no longer exists: ignore it.
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

**For the backend:** the lead needs an `answers` field (JSON) stored as sent and
returned on `GET /admin/leads`. The dashboard already reads `lead.answers` when
it's present and shows it on the enquiry. Until then it shows nothing, so this
can ship in any order.
