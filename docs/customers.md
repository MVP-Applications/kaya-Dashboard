# Customers: admin API

**For:** the backend team, with a note for the website team at the end.
**Status:** the dashboard screen (**Enquiries → Customers**) is built and works
in preview mode. There are no admin endpoints yet, so the dashboard's client is
switched off (`CUSTOMERS_API_READY` in `lib/admin/store-api.js`).

These are the accounts the website creates when someone signs in with a
mobile OTP, Google, Apple or Samsung (`/customer/*`, see the website's
`docs/customer-auth-api.md`). This document covers the **staff** side: how
Kaya's Administrators view and manage those accounts.

The customer record is the website's own `Customer` shape
(`kaya-website/lib/api/auth.js`), plus two fields only staff see:
`status` and `lastSignInAt`.

---

## 1. Privacy rules the backend must enforce

The dashboard hides these things in its interface, but that isn't protection
on its own. The server must enforce every rule below.

1. **Administrators only.** Every `/admin/customers*` route requires a staff
   token with role `ADMIN`. `STAFF` gets 403. Customer tokens must never be
   accepted, the same rule as `/admin/*` today.
2. **List and profile responses never contain health data.** `allergies`,
   `medications`, `medicalConditions`, `isPregnant` and `isBreastfeeding` are
   left out of `GET /admin/customers`, `GET /admin/customers/:id` and the CSV
   export. They are left out entirely, not set to null.
3. **Health data has one door.** `GET /admin/customers/:id/medical` is the
   only route that returns it, and **every call writes an audit entry**:
   staff id, customer id, timestamp and IP. Write the entry *before*
   responding, and if the entry can't be written, fail the request. The
   existing `auditLogs` module is the natural home for this.
4. **No consent, no data.** If `healthConsentAt` is null, `/medical` returns
   `null`. When a customer withdraws consent, their medical fields are
   deleted, not hidden. The website already describes it that way to them.
5. **The export has no health data.** Its columns are listed in section 3.

---

## 2. Endpoints

| Method | Route | Returns |
|---|---|---|
| `GET` | `/api/v1/admin/customers` | A page of **summaries** (section 3). Supports filters (below) and `page` / `pageSize`, with `meta.pagination.total` like other admin lists. |
| `GET` | `/api/v1/admin/customers/counts` | `{ total, newThisWeek, withConsent, disabled }`, used by the summary chips |
| `GET` | `/api/v1/admin/customers/:id` | One summary |
| `GET` | `/api/v1/admin/customers/:id/medical` | The medical record, or `null` if there's no consent. **Audited.** |
| `GET` | `/api/v1/admin/customers/:id/access-log` | `[{ staffId, staffName, at }]`, newest first: who has opened `/medical` for this customer |
| `PATCH` | `/api/v1/admin/customers/:id/status` | Body `{ "status": "ACTIVE" \| "DISABLED" }`. Returns the updated summary. |
| `DELETE` | `/api/v1/admin/customers/:id` | Erases the account (section 4) |
| `GET` | `/api/v1/admin/customers/export.csv` | CSV, same filters as the list |

These routes are proposals, also set in `lib/api/endpoints.js` under
`customers`. Rename them there if the backend differs.

**List filters** (query parameters, all optional):

| Param | Values |
|---|---|
| `search` | Matches name and email, case-insensitive. Also matches the phone **by digits**, so `0000005` finds `+968910000005`. |
| `provider` | `PHONE` \| `GOOGLE` \| `APPLE` \| `SAMSUNG`: any account that has this sign-in method |
| `country` | `UAE` \| `KSA` \| `Oman`, taken from the phone's dialling code (+971, +966, +968) |
| `consent` | `given` \| `none` |
| `completeness` | `complete` \| `incomplete`, using the same 8 fields as the website's profile meter: fullName, email, phone, dateOfBirth, gender, heightCm, weightKg, healthConsentAt |
| `status` | `ACTIVE` \| `DISABLED` |

Sort newest `createdAt` first.

---

## 3. Shapes

**Summary** (list, profile, status response):

```json
{
  "id": "cus-001",
  "fullName": "Noura Al Hashimi",
  "email": "noura@example.com",
  "phone": "+971560000009",
  "dateOfBirth": "1992-04-18",
  "gender": "FEMALE",
  "heightCm": 164,
  "weightKg": 58,
  "healthConsentAt": "2026-09-22T09:00:00.000Z",
  "hasHealthConsent": true,
  "authProviders": ["PHONE", "GOOGLE"],
  "status": "ACTIVE",
  "createdAt": "2026-09-22T09:00:00.000Z",
  "lastSignInAt": "2026-09-24T08:10:00.000Z"
}
```

`hasHealthConsent` is just `healthConsentAt != null`, sent for convenience.
Everything else is the website's `Customer` fields.

**Medical** (`/medical` only):

```json
{
  "allergies": "Penicillin",
  "medications": "Iron supplement",
  "medicalConditions": "None",
  "isPregnant": false,
  "isBreastfeeding": true
}
```

**CSV columns:** Name, Email, Mobile, Country, Date of birth, Gender,
Height (cm), Weight (kg), Signs in with, Profile complete, Health consent
(Given / Not given), Status, Joined, Last sign-in. There are no medical columns.

---

## 4. Disabling and deleting

- **Disable** (`status: DISABLED`): the customer can't sign in. OTP and OAuth
  sign-in are refused, and existing refresh tokens are revoked so sessions
  already open end too. Nothing is deleted, and re-enabling restores access.
- **Delete:** used when a customer asks for their data to be erased.
  - Remove the account, profile and medical record, and revoke all tokens.
  - **Enquiries (leads) and voucher requests are kept.** They're separate
    business records, and the dashboard tells the admin so before they confirm.
  - Decide with Kaya's compliance lead whether the medical access log for a
    deleted customer is kept (as evidence of lawful access) or erased with
    them. The preview currently erases it.

---

## 5. Linking a customer to their enquiries

The profile lists the customer's enquiries and voucher requests by calling the
**existing** list endpoints with `search=<email>` and `search=<phone>`. No new
endpoint is needed. For this to work, `/admin/leads` and
`/admin/voucher-requests` search should match phone numbers by digits,
ignoring spaces and formatting. The website stores `+971560000009`, while an
enquiry form may have `+971 56 000 0009`.

A stronger link later would be a `customerId` on leads and voucher requests,
set when a signed-in customer submits one. The dashboard can switch to that
without any screen changes.

---

## Note for the website team

The profile page tells customers their medical information is "only shared
with the Kaya doctors treating you". Staff can now see it, but only
Administrators, and every view is logged. Consider adjusting that line, or
the consent text, so it's accurate. For example: "Only visible to the
Kaya clinical team treating you. Every access is recorded." **Kaya's
compliance lead should approve the final wording.**
