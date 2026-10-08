/**
 * How the Footer tab is split on screen. Display only: each panel shows some
 * (or all) of one footer section's fields, and saving still works per section
 * exactly as before.
 *
 * - `section`: the FOOTER_GROUP section id the fields come from
 * - `keys`:    which of that section's fields this panel shows (all when left out)
 * - `hint`:    replaces the section's hint when the panel is only part of it
 */
export const FOOTER_PANELS = [
  { id: 'brand', label: 'Brand & socials', section: 'brand' },
  {
    id: 'treatments', label: 'Treatments column', section: 'columns', keys: ['treatmentsHeading'],
    hint: 'This column lists the Verticals automatically, with Tell us Everything at the top — only its heading is edited here.',
  },
  {
    id: 'company', label: 'Company column', section: 'columns', keys: ['companyHeading', 'companyLinks'],
    hint: 'A column with no heading and no links is hidden on the website.',
  },
  {
    id: 'support', label: 'Support column', section: 'columns', keys: ['supportHeading', 'supportLinks'],
    hint: 'A column with no heading and no links is hidden on the website.',
  },
  { id: 'newsletter', label: 'Newsletter', section: 'newsletter' },
  { id: 'legal', label: 'Legal bar', section: 'legal' },
]
