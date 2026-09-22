/**
 * Website content schema + seed copy for the dashboard.
 *
 * Unlike services/doctors/reviews — which are *lists* of records — page copy is
 * a fixed set of named sections with named fields. Rather than hand-writing a
 * bespoke form per page, each section declares its fields here and the CMS
 * renders them generically (see components/admin/ContentFields.js).
 *
 * Every field carries its `default`, transcribed from the live site, so this
 * file is both the schema and the seed. The public pages still read their own
 * hardcoded copy — same as the other views, this is the seam where a real API
 * (Payload globals) plugs in later.
 *
 * Field types: text · textarea · toggle · image · strings (list of plain
 * strings) · list (repeater of objects, with a nested `fields` array).
 * `width: 'half'` pairs consecutive fields into a two-column row.
 */

// ── Homepage ─────────────────────────────────────────────
const HOME = {
  id: 'home',
  label: 'Homepage',
  path: '/',
  icon: '⌂',
  hint: 'Announcement strip, bento hero, promo banners, and section headings.',
  sections: [
    {
      id: 'announcement',
      label: 'Announcement bar',
      hint: 'The thin dismissible strip above the header.',
      fields: [
        { key: 'enabled', label: 'Show the announcement bar', type: 'toggle', default: true },
        { key: 'text', label: 'Message', type: 'text', default: 'Now open in Riyadh —', width: 'half' },
        { key: 'linkLabel', label: 'Link label', type: 'text', default: 'Book your first visit →', width: 'half' },
        { key: 'href', label: 'Link URL', type: 'text', default: '#' },
      ],
    },
    {
      id: 'hero',
      label: 'Bento hero heading',
      hint: 'The large headline above the banners. The emphasis half renders in italic serif.',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text', default: "The care you've always", width: 'half' },
        { key: 'headingEm', label: 'Heading — emphasis', type: 'text', default: 'deserved', width: 'half' },
      ],
    },
    {
      id: 'bannerPrimary',
      label: 'Primary banner',
      hint: 'The brand banner that opens the booking modal.',
      fields: [
        { key: 'image', label: 'Background image', type: 'image' },
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Kaya Clinic' },
        { key: 'title', label: 'Title', type: 'text', default: 'Where beauty meets', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'medicine', width: 'half' },
        { key: 'stats', label: 'Stat line', type: 'text', default: '23 yrs experience · 600K+ clients · 35 clinics' },
        { key: 'ctaLabel', label: 'Button label', type: 'text', default: 'Book consultation' },
      ],
    },
    {
      id: 'bannerTellUs',
      label: 'Tell-us banner',
      hint: 'The second banner, linking to the concern finder.',
      fields: [
        { key: 'image', label: 'Background image', type: 'image' },
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Just for you' },
        { key: 'title', label: 'Title', type: 'text', default: 'Personalised', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'treatments', width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: "Answer 3 quick questions — we'll match you to the right treatment.",
        },
        { key: 'ctaLabel', label: 'Button label', type: 'text', default: 'Tell us everything', width: 'half' },
        { key: 'href', label: 'Link URL', type: 'text', default: '/tell-us', width: 'half' },
      ],
    },
    {
      id: 'popularTreatments',
      label: 'Popular treatments row',
      hint: 'Heading for the featured-treatments carousel. The cards themselves come from Treatments & Services.',
      fields: [
        { key: 'title', label: 'Title', type: 'text', default: 'Popular', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'treatments', width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: "Handpicked by our specialists — what's getting booked most this month.",
        },
        { key: 'linkLabel', label: 'See-all link', type: 'text', default: 'See all treatments →' },
      ],
    },
    {
      id: 'indulgenceRow',
      label: 'Indulgence row',
      hint: 'Heading for the voucher carousel. The cards come from the Indulgence section.',
      fields: [
        { key: 'title', label: 'Title', type: 'text', default: 'The Kaya', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'Indulgence', width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: 'Gift cards and credit bundles, ready to gift or redeem.',
        },
        { key: 'linkLabel', label: 'See-all link', type: 'text', default: 'See all offers →' },
      ],
    },
    {
      id: 'doctorsBanner',
      label: 'Doctors banner',
      hint: 'Heading above the doctor carousel. The cards come from the Doctors section.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Meet our doctors' },
        { key: 'title', label: 'Title', type: 'text', default: 'Care led by', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'experts', width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: 'Board-certified specialists across every treatment area — trusted by thousands across the GCC.',
        },
        { key: 'ctaLabel', label: 'Button label', type: 'text', default: 'Book consultation', width: 'half' },
        { key: 'linkLabel', label: 'See-all link', type: 'text', default: 'View all doctors →', width: 'half' },
      ],
    },
    {
      id: 'tellUsPromo',
      label: 'Tell-us promo block',
      hint: 'The split promo with the vertical carousel on the right.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Personalised for you' },
        { key: 'headline', label: 'Headline', type: 'text', default: 'Not sure where to start?', width: 'half' },
        { key: 'headlineEm', label: 'Headline — emphasis', type: 'text', default: 'Tell us everything.', width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: "Answer a few quick questions and we'll match you to the right treatments — no medical jargon, no guesswork. Just a clear path forward.",
        },
        { key: 'ctaLabel', label: 'Button label', type: 'text', default: 'Tell us Everything', width: 'half' },
        { key: 'pickerLabel', label: 'Carousel label', type: 'text', default: "Or pick where you'd like to begin", width: 'half' },
      ],
    },
    {
      id: 'reviews',
      label: 'Reviews section',
      hint: 'Heading above the before/after grid. The cards come from the Reviews section.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Real results' },
        { key: 'title', label: 'Title', type: 'text', default: 'Trusted by', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: '600K+', width: 'half' },
        { key: 'titleEnd', label: 'Title — after emphasis', type: 'text', default: 'across the GCC' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: 'Real clients, real outcomes — shared with consent.',
        },
      ],
    },
  ],
}

// ── About ────────────────────────────────────────────────
const ABOUT = {
  id: 'about',
  label: 'About Kaya',
  path: '/about',
  icon: '❖',
  hint: 'Brand story, guiding principles, and regional reach.',
  sections: [
    {
      id: 'meta',
      label: 'Search metadata',
      hint: 'Shown in search results and browser tabs.',
      fields: [
        {
          key: 'title', label: 'Page title', type: 'text',
          default: 'About Kaya — 23 Years of Doctor-Led Care in the GCC',
        },
        {
          key: 'description', label: 'Meta description', type: 'textarea',
          default: "Founded in 2001, Kaya is the GCC's largest doctor-led wellness network — dermatology, body slimming, longevity medicine, and plastic surgery across the UAE, KSA, and Oman.",
        },
      ],
    },
    {
      id: 'hero',
      label: 'Hero',
      fields: [
        { key: 'image', label: 'Background image', type: 'image', default: '/Assets/banner 4.jpg' },
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Our story' },
        { key: 'title', label: 'Title', type: 'text', default: 'Doctor-led wellness,', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'built for the GCC', width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: "For over two decades, Kaya has been the region's most trusted name in physician-led skin, body, and longevity care — growing from a single clinic to 35 locations across three countries.",
        },
        {
          key: 'stats', label: 'Stat row', type: 'list', itemLabel: 'Stat',
          fields: [
            { key: 'value', label: 'Value', type: 'text', width: 'half' },
            { key: 'label', label: 'Label', type: 'text', width: 'half' },
          ],
          default: [
            { value: '2001', label: 'Founded' },
            { value: '600K+', label: 'Clients' },
            { value: '35', label: 'Clinics' },
            { value: '3', label: 'Countries' },
          ],
        },
      ],
    },
    {
      id: 'story',
      label: 'Our story',
      hint: 'Long-form brand narrative and the pull quote beside it.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Founded 2001' },
        { key: 'title', label: 'Title', type: 'text', default: 'Born in the region,', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'built for it', width: 'half' },
        { key: 'image', label: 'Story image', type: 'image', default: '/Assets/maintreatment 14.jpg' },
        {
          key: 'paragraphs', label: 'Body paragraphs', type: 'strings', itemLabel: 'Paragraph',
          default: [
            'Kaya was founded in Dubai in 2001 with a simple but radical idea: that medical-grade skin care should be accessible, doctor-led, and designed specifically for people living in the Gulf. At a time when the regional aesthetic industry was largely unregulated, Kaya built a clinical model that put physicians at the centre of every patient interaction.',
            'Over the following two decades, that model proved itself — not through marketing, but through results. Clients returned. Families trusted us with their children. Referrals outnumbered advertising. Today, with 35 clinics across the UAE, Saudi Arabia, and Oman, we remain independent, physician-owned, and clinically led.',
            'In 2022 we expanded our scope from dermatology into longevity medicine, body contouring, and plastic surgery — bringing the same rigour that made our skin clinic the region’s most trusted into categories that had never seen it.',
          ],
        },
        {
          key: 'quote', label: 'Pull quote', type: 'textarea',
          default: 'We built Kaya because patients in the GCC deserved better than what existed.',
        },
        { key: 'quoteEm', label: 'Pull quote — emphasis', type: 'text', default: 'They still do.', width: 'half' },
        { key: 'attribution', label: 'Attribution', type: 'text', default: 'Kaya Founding Team, Dubai 2001', width: 'half' },
      ],
    },
    {
      id: 'principles',
      label: 'Principles',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'What we believe' },
        { key: 'title', label: 'Title', type: 'text', default: 'Three principles that', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'guide everything', width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: 'Every decision at Kaya — clinical, operational, cultural — runs through the same filter.',
        },
        {
          key: 'items', label: 'Principles', type: 'list', itemLabel: 'Principle',
          fields: [
            { key: 'icon', label: 'Icon', type: 'icon' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'desc', label: 'Description', type: 'textarea' },
          ],
          default: [
            {
              icon: '⚕',
              title: 'Doctor-first, always',
              desc: "Every diagnosis, treatment plan, and procedure is led by a licensed physician. We've never delegated clinical decisions to technicians — and never will.",
            },
            {
              icon: '◎',
              title: 'Holistic by design',
              desc: 'Skin, body, mind, and longevity under one roof. We treat the whole person, not just a concern — connecting specialties that most clinics keep apart.',
            },
            {
              icon: '♾',
              title: 'GCC expertise, globally trained',
              desc: 'Our doctors understand GCC skin types, climates, and cultural expectations — combined with international training across Europe, the US, and Asia.',
            },
          ],
        },
      ],
    },
    {
      id: 'reach',
      label: 'Regional reach',
      hint: 'The network map and the per-country cards beneath it.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Where we are' },
        { key: 'title', label: 'Title', type: 'text', default: 'Across the GCC,', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'close to you', width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: '35 clinics, 3 countries, one standard of care. Wherever you are in the region, a Kaya physician is nearby.',
        },
        { key: 'mapClinics', label: 'Map badge — clinics', type: 'text', default: '35', width: 'half' },
        { key: 'mapCountries', label: 'Map badge — countries', type: 'text', default: '3', width: 'half' },
        {
          key: 'regions', label: 'Countries', type: 'list', itemLabel: 'Country',
          fields: [
            { key: 'flag', label: 'Flag', type: 'icon', width: 'half' },
            { key: 'short', label: 'Short name', type: 'text', width: 'half' },
            { key: 'country', label: 'Country', type: 'text', width: 'half' },
            { key: 'count', label: 'Clinic count', type: 'text', width: 'half' },
            { key: 'cities', label: 'Cities', type: 'textarea' },
          ],
          default: [
            {
              flag: '🇦🇪', short: 'UAE', country: 'United Arab Emirates', count: '20',
              cities: 'Dubai Marina · Downtown Dubai · Abu Dhabi · Al Ain · Sharjah · Ajman · Ras Al Khaimah',
            },
            {
              flag: '🇸🇦', short: 'KSA', country: 'Saudi Arabia', count: '12',
              cities: 'Riyadh · Jeddah · Dammam · Khobar · Makkah · Medina',
            },
            {
              flag: '🇴🇲', short: 'Oman', country: 'Oman', count: '3',
              cities: 'Muscat · Salalah',
            },
          ],
        },
      ],
    },
  ],
}

// ── Treatments hub ───────────────────────────────────────
const TREATMENTS = {
  id: 'treatments',
  label: 'Treatments hub',
  path: '/treatments',
  icon: '✦',
  hint: 'The all-treatments landing page. Individual treatments live under Treatments & Services.',
  sections: [
    {
      id: 'hero',
      label: 'Hero',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'All Treatments' },
        { key: 'title', label: 'Title', type: 'text', default: 'Six specialties.', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'One standard.', width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: 'Face & skin, body, hair, energy & wellness, mens, and surgery — all physician-led, all under one medical roof in the GCC.',
        },
      ],
    },
    {
      id: 'trust',
      label: 'Trust pillars',
      fields: [
        {
          key: 'items', label: 'Pillars', type: 'list', itemLabel: 'Pillar',
          fields: [
            { key: 'icon', label: 'Icon', type: 'icon' },
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'desc', label: 'Description', type: 'textarea' },
          ],
          default: [
            {
              icon: '⚕',
              title: 'Physician-only care',
              desc: 'Every treatment across every specialty is performed or directly supervised by a licensed physician — not a technician working alone.',
            },
            {
              icon: '◎',
              title: 'GCC-skin & climate expertise',
              desc: "23 years treating patients across the GCC. Every protocol is built for the region's skin types, climate, and health profile.",
            },
            {
              icon: '✦',
              title: 'Medical-grade technology',
              desc: 'FDA-cleared devices and evidence-based interventions only — the same standards used in leading medical centres worldwide.',
            },
          ],
        },
      ],
    },
    {
      id: 'verticalCopy',
      label: 'Specialty descriptions',
      hint: 'One paragraph per vertical, shown on the alternating rows. Vertical labels and colours are managed under Verticals.',
      fields: [
        {
          key: 'items', label: 'Descriptions', type: 'list', itemLabel: 'Specialty',
          fields: [
            { key: 'vertical', label: 'Vertical ID', type: 'text', width: 'half' },
            { key: 'desc', label: 'Description', type: 'textarea' },
          ],
          default: [
            {
              vertical: 'face-skin',
              desc: 'From pigmentation and fine lines to acne scarring, our dermatologists combine medical-grade lasers, peels, and injectables — calibrated specifically for GCC skin types — to deliver visible, lasting results.',
            },
            {
              vertical: 'body',
              desc: 'Non-surgical contouring and skin-tightening technologies target stubborn fat and improve tone, with no surgery and no downtime — every protocol supervised by a physician from consultation to result.',
            },
            {
              vertical: 'hair',
              desc: 'PRP restoration and advanced laser hair removal address thinning, hair loss, and unwanted hair — safe and effective across all skin tones common in the region.',
            },
            {
              vertical: 'wellness',
              desc: 'Comprehensive biomarker testing, IV therapy, and hormonal optimisation build a personalised longevity protocol — designed to extend your healthspan, not just treat symptoms.',
            },
            {
              vertical: 'mens',
              desc: 'A dedicated specialty spanning hair, skin, body, and anti-ageing — built around the specific concerns and physiology of male patients, from hairlines to hormones.',
            },
            {
              vertical: 'surgery',
              desc: 'Board-certified plastic surgeons deliver rhinoplasty, body contouring, and facial rejuvenation with a structural, natural-results-first philosophy.',
            },
          ],
        },
      ],
    },
  ],
}

// ── Vertical landing pages ───────────────────────────────
/** Hero fields are identical across the four vertical landing pages. */
function heroFields({ eyebrow, headline, headlineEm, headlineEnd = '', sub, image, primaryCta, secondaryCta }) {
  return [
    { key: 'image', label: 'Background image', type: 'image', default: image },
    { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: eyebrow },
    { key: 'headline', label: 'Headline', type: 'text', default: headline, width: 'half' },
    { key: 'headlineEm', label: 'Headline — emphasis', type: 'text', default: headlineEm, width: 'half' },
    { key: 'headlineEnd', label: 'Headline — after emphasis', type: 'text', default: headlineEnd },
    { key: 'sub', label: 'Subtitle', type: 'textarea', default: sub },
    { key: 'primaryCta', label: 'Primary button', type: 'text', default: primaryCta, width: 'half' },
    { key: 'secondaryCta', label: 'Secondary link', type: 'text', default: secondaryCta, width: 'half' },
  ]
}

/** The eyebrow / title / subtitle trio that opens most page sections. */
function introFields({ eyebrow, title, titleEm, sub }) {
  return [
    { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: eyebrow },
    { key: 'title', label: 'Title', type: 'text', default: title, width: 'half' },
    { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: titleEm, width: 'half' },
    { key: 'sub', label: 'Subtitle', type: 'textarea', default: sub },
  ]
}

/** Icon + label + hint cards (trust points and icon pillars). */
function pointsField(label, itemLabel, items) {
  return {
    key: 'items', label, type: 'list', itemLabel,
    fields: [
      { key: 'icon', label: 'Icon', type: 'icon', width: 'half' },
      { key: 'label', label: 'Label', type: 'text', width: 'half' },
      { key: 'hint', label: 'Hint', type: 'textarea' },
    ],
    default: items,
  }
}

const AESTHETIC = {
  id: 'aesthetic',
  label: 'Aesthetic landing',
  path: '/aesthetic',
  icon: '◈',
  hint: 'Hero, the three pathway cards, trust stats, and closing CTA.',
  sections: [
    {
      id: 'hero',
      label: 'Hero',
      fields: heroFields({
        image: '/Assets/maintreatment 13.jpg',
        eyebrow: 'Aesthetic Treatments',
        headline: 'Your most',
        headlineEm: 'confident',
        headlineEnd: 'self',
        sub: 'Medical-grade aesthetic treatments across dermatology, body sculpting, and hair. Delivered by Kaya specialists with 23 years of proven expertise.',
        primaryCta: 'Book consultation',
        secondaryCta: 'Find my treatment →',
      }),
    },
    {
      id: 'pillarsIntro',
      label: 'Pathways heading',
      fields: introFields({
        eyebrow: 'What we offer',
        title: 'Three paths to your',
        titleEm: 'best self',
        sub: "Whether you're treating your skin, reshaping your body, or restoring your hair — Kaya has a specialist pathway for you.",
      }),
    },
    {
      id: 'pillars',
      label: 'Pathway cards',
      fields: [
        {
          key: 'items', label: 'Pathways', type: 'list', itemLabel: 'Pathway',
          fields: [
            { key: 'label', label: 'Label', type: 'text', width: 'half' },
            { key: 'href', label: 'Link URL', type: 'text', width: 'half' },
            { key: 'hint', label: 'Hint', type: 'text' },
            { key: 'image', label: 'Image', type: 'image' },
          ],
          default: [
            {
              label: 'Face & Skin', href: '/treatments/dermatology',
              hint: 'Acne · Anti-ageing · Pigmentation', image: '/Assets/maintreatment 9.jpg',
            },
            {
              label: 'Body Contouring', href: '/treatments/slimming',
              hint: 'Fat reduction · Sculpting · Tightening', image: '/Assets/maintreatment 11.jpg',
            },
            {
              label: 'Hair', href: '/treatments/dermatology',
              hint: 'PRP restoration · Laser removal', image: '/Assets/subtreatment 2.jpg',
            },
          ],
        },
      ],
    },
    {
      id: 'featuredIntro',
      label: 'Featured treatments heading',
      fields: introFields({
        eyebrow: 'Popular treatments',
        title: 'Where most clients',
        titleEm: 'start',
        sub: 'Our most-requested aesthetic treatments — each delivered by a certified Kaya specialist.',
      }),
    },
    {
      id: 'trustStats',
      label: 'Trust bar',
      fields: [
        {
          key: 'items', label: 'Stats', type: 'list', itemLabel: 'Stat',
          fields: [
            { key: 'value', label: 'Value', type: 'text', width: 'half' },
            { key: 'label', label: 'Label', type: 'text', width: 'half' },
          ],
          default: [
            { value: '23', label: 'Years in aesthetic medicine' },
            { value: '600K+', label: 'Clients treated' },
            { value: '35', label: 'Clinics across the region' },
            { value: '100%', label: 'Medical-grade procedures' },
          ],
        },
      ],
    },
    {
      id: 'cta',
      label: 'Closing CTA',
      fields: [
        { key: 'headline', label: 'Headline', type: 'text', default: 'Ready to start your aesthetic journey?' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: "Book a consultation — we'll build a treatment plan around your goals.",
        },
        { key: 'primaryCta', label: 'Primary button', type: 'text', default: 'Book consultation', width: 'half' },
        { key: 'secondaryCta', label: 'Secondary link', type: 'text', default: 'Find my treatment', width: 'half' },
      ],
    },
  ],
}

const WELLNESS = {
  id: 'wellness',
  label: 'Wellness & Longevity landing',
  path: '/wellness-longevity',
  icon: '⌘',
  hint: 'Hero, approach pillars, protocol heading, and closing CTA.',
  sections: [
    {
      id: 'hero',
      label: 'Hero',
      fields: heroFields({
        image: '/Assets/maintreatment 8.jpg',
        eyebrow: 'Wellness & Longevity',
        headline: 'Longevity is',
        headlineEm: 'a choice',
        sub: 'Science-backed wellness protocols designed to extend your energy, vitality, and lifespan. From inside-out cellular health to advanced biomarker tracking.',
        primaryCta: 'Book consultation',
        secondaryCta: 'Find my programme',
      }),
    },
    {
      id: 'pillarsIntro',
      label: 'Approach heading',
      fields: introFields({
        eyebrow: 'Our approach',
        title: 'Wellness that',
        titleEm: 'works',
        sub: 'We combine advanced diagnostics with precision protocols — built around your biology, not a generic programme.',
      }),
    },
    {
      id: 'pillars',
      label: 'Approach pillars',
      fields: [
        pointsField('Pillars', 'Pillar', [
          { icon: '⚡', label: 'Energy & Vitality', hint: 'IV drips · NAD+ · Mitochondrial health' },
          { icon: '🧬', label: 'Longevity Science', hint: 'Biomarkers · Peptides · Hormonal balance' },
          { icon: '🌿', label: 'Recovery & Repair', hint: 'Detox protocols · Cellular restoration' },
        ]),
      ],
    },
    {
      id: 'featuredIntro',
      label: 'Protocols heading',
      fields: introFields({
        eyebrow: 'Protocols & Programmes',
        title: 'Where clients',
        titleEm: 'begin',
        sub: 'Our most-requested wellness protocols — each backed by science and delivered by Kaya specialists.',
      }),
    },
    {
      id: 'cta',
      label: 'Closing CTA',
      fields: [
        { key: 'headline', label: 'Headline', type: 'text', default: 'Ready to start?', width: 'half' },
        { key: 'headlineEm', label: 'Headline — emphasis', type: 'text', default: "Let's build your protocol.", width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: "Book a wellness consultation — we'll build a protocol designed around your health goals.",
        },
      ],
    },
  ],
}

const MENS = {
  id: 'mens',
  label: "Men's landing",
  path: '/mens',
  icon: '♂',
  hint: 'Hero, discretion trust points, featured heading, and closing CTA.',
  sections: [
    {
      id: 'hero',
      label: 'Hero',
      fields: heroFields({
        image: '/Assets/maintreatment 7.jpg',
        eyebrow: "Men's Treatments",
        headline: 'Built for men.',
        headlineEm: 'Backed by medicine.',
        sub: "Hair, skin, and body treatments designed around men's specific needs — delivered with complete discretion by board-certified specialists.",
        primaryCta: 'Book consultation',
        secondaryCta: 'Find my treatment',
      }),
    },
    {
      id: 'trust',
      label: 'Trust points',
      fields: [
        pointsField('Trust points', 'Point', [
          { icon: '🩺', label: 'Board-certified specialists', hint: 'Every treatment led by a qualified physician' },
          { icon: '🕒', label: 'Fits your schedule', hint: 'Fast, discreet appointments built around your time' },
          { icon: '🔒', label: 'Complete discretion', hint: 'Private consultations, no waiting rooms' },
          { icon: '💪', label: 'Real, lasting results', hint: 'Evidence-based treatments, not gimmicks' },
        ]),
      ],
    },
    {
      id: 'featuredIntro',
      label: 'Featured treatments heading',
      fields: introFields({
        eyebrow: 'Popular with men',
        title: 'Treatments built',
        titleEm: 'around you',
        sub: 'A curated selection of hair, skin, and body treatments — each delivered by a specialist, tailored to your goals.',
      }),
    },
    {
      id: 'cta',
      label: 'Closing CTA',
      fields: [
        { key: 'headline', label: 'Headline', type: 'text', default: 'Ready to start?', width: 'half' },
        { key: 'headlineEm', label: 'Headline — emphasis', type: 'text', default: "Let's talk, discreetly.", width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: 'Schedule a private consultation with one of our specialists — no commitment, just clarity.',
        },
      ],
    },
  ],
}

const SURGERY = {
  id: 'surgery',
  label: 'Plastic Surgery landing',
  path: '/surgery',
  icon: '✚',
  hint: 'Hero, surgical trust points, procedures heading, and closing CTA.',
  sections: [
    {
      id: 'hero',
      label: 'Hero',
      fields: heroFields({
        image: '/Assets/maintreatment 12.jpg',
        eyebrow: 'Plastic Surgery',
        headline: 'Transform.',
        headlineEm: 'Permanently.',
        sub: 'Board-certified surgeons delivering life-changing surgical outcomes with precision, artistry, and care. Natural results. Lasting confidence.',
        primaryCta: 'Request consultation',
        secondaryCta: 'Explore procedures',
      }),
    },
    {
      id: 'trust',
      label: 'Trust points',
      fields: [
        pointsField('Trust points', 'Point', [
          { icon: '🩺', label: 'Board-certified surgeons', hint: 'All procedures performed by qualified consultants' },
          { icon: '🏥', label: 'Accredited facilities', hint: 'Hospital-grade operating theatres' },
          { icon: '🤝', label: 'Thorough consultations', hint: 'We take time to understand your goals' },
          { icon: '✨', label: 'Natural-looking results', hint: 'Artistry and precision in every outcome' },
        ]),
      ],
    },
    {
      id: 'featuredIntro',
      label: 'Procedures heading',
      fields: introFields({
        eyebrow: 'Surgical procedures',
        title: 'Our most-requested',
        titleEm: 'procedures',
        sub: 'Every procedure is performed by a board-certified surgeon and supported by our full pre- and post-operative care team.',
      }),
    },
    {
      id: 'cta',
      label: 'Closing CTA',
      fields: [
        { key: 'headline', label: 'Headline', type: 'text', default: 'Ready to start?', width: 'half' },
        { key: 'headlineEm', label: 'Headline — emphasis', type: 'text', default: "Let's discuss your goals.", width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: 'Schedule a private consultation with one of our surgical specialists — no commitment, just clarity.',
        },
      ],
    },
  ],
}

// ── Remaining page heroes ────────────────────────────────
const DOCTORS_PAGE = {
  id: 'doctorsPage',
  label: 'Doctors listing',
  path: '/doctors',
  icon: '⚕',
  hint: 'Hero copy only — the doctor records are managed under Doctors.',
  sections: [
    {
      id: 'hero',
      label: 'Hero',
      fields: [
        { key: 'image', label: 'Background image', type: 'image', default: '/Assets/banner 3.jpg' },
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Meet our doctors' },
        { key: 'title', label: 'Title', type: 'text', default: 'Meet Our', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'Experts', width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: "They see what makes you unique — and that's exactly what sets them apart. Meet the region's largest team of physicians, trusted by thousands across the GCC.",
        },
      ],
    },
  ],
}

const INDULGENCE_PAGE = {
  id: 'indulgencePage',
  label: 'Indulgence page',
  path: '/indulgence',
  icon: '🎁',
  hint: 'Hero copy only — the vouchers themselves are managed under Indulgence.',
  sections: [
    {
      id: 'hero',
      label: 'Hero',
      fields: [
        { key: 'image', label: 'Background image', type: 'image', default: '/Assets/banner 5.jpg' },
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Gift Cards & Vouchers' },
        { key: 'title', label: 'Title', type: 'text', default: 'The Kaya', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'Indulgence', width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: "Give the extraordinary. Exclusive vouchers for Kaya's world-class treatments — delivered instantly to email or WhatsApp.",
        },
      ],
    },
  ],
}

const FIND_US_PAGE = {
  id: 'findUsPage',
  label: 'Find a clinic',
  path: '/find-us',
  icon: '⌖',
  hint: 'Section heading only — the clinic records are managed under Locations.',
  sections: [
    {
      id: 'header',
      label: 'Section heading',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Locations' },
        { key: 'title', label: 'Title', type: 'text', default: 'Find your nearest', width: 'half' },
        { key: 'titleEm', label: 'Title — emphasis', type: 'text', default: 'Kaya clinic', width: 'half' },
      ],
    },
  ],
}

/** One step of the concern-finder funnel. */
function stepSection(id, label, { eyebrow, heading, headingEm, sub }) {
  return {
    id,
    label,
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: eyebrow },
      { key: 'heading', label: 'Heading', type: 'text', default: heading, width: 'half' },
      { key: 'headingEm', label: 'Heading — emphasis', type: 'text', default: headingEm, width: 'half' },
      { key: 'sub', label: 'Subtitle', type: 'textarea', default: sub },
    ],
  }
}

const TELL_US_PAGE = {
  id: 'tellUsPage',
  label: 'Tell us Everything',
  path: '/tell-us',
  icon: '◔',
  hint: 'Copy for each step of the concern-finder funnel.',
  sections: [
    stepSection('step1', 'Step 1 — Treatment area', {
      eyebrow: 'Tell us everything',
      heading: 'What would you like to',
      headingEm: 'address',
      sub: "Choose one area — we'll guide you to the right treatments.",
    }),
    stepSection('step2', 'Step 2 — Gender', {
      eyebrow: 'A little more about you',
      heading: 'What is your',
      headingEm: 'gender',
      sub: 'This helps us tailor treatments to your specific needs.',
    }),
    stepSection('step3', 'Step 3 — Age range', {
      eyebrow: 'A little more about you',
      heading: 'Which',
      headingEm: 'age range',
      sub: "This helps us tailor the most suitable treatments for your skin's stage.",
    }),
    stepSection('step4', 'Step 4 — Concerns', {
      eyebrow: 'Refine your concerns',
      heading: 'What specifically',
      headingEm: 'bothers',
      sub: 'Select one or more concerns — this filters the most effective treatments for you.',
    }),
    stepSection('step5', 'Step 5 — Results', {
      eyebrow: 'Your matched treatments',
      heading: "Here's what Kaya",
      headingEm: 'recommends.',
      sub: "Select the treatments you'd like to proceed with, then book a consultation.",
    }),
  ],
}

/** Every editable page, in sidebar order. */
export const PAGES = [
  HOME,
  ABOUT,
  TREATMENTS,
  AESTHETIC,
  WELLNESS,
  MENS,
  SURGERY,
  DOCTORS_PAGE,
  INDULGENCE_PAGE,
  TELL_US_PAGE,
  FIND_US_PAGE,
]

// ── Footer & global settings ─────────────────────────────
const FOOTER_GROUP = {
  id: 'footer',
  label: 'Footer',
  icon: '▭',
  hint: 'Tagline, link columns, newsletter, and legal line.',
  sections: [
    {
      id: 'brand',
      label: 'Brand column',
      fields: [
        {
          key: 'tagline', label: 'Tagline', type: 'textarea',
          default: 'Doctor-led care across the GCC — skin, body, longevity, and surgery under one roof.',
        },
        {
          key: 'socials', label: 'Social links', type: 'list', itemLabel: 'Social',
          fields: [
            { key: 'platform', label: 'Platform', type: 'text', width: 'half' },
            { key: 'url', label: 'URL', type: 'text', width: 'half' },
          ],
          default: [
            { platform: 'Instagram', url: '#' },
            { platform: 'Facebook', url: '#' },
            { platform: 'TikTok', url: '#' },
          ],
        },
      ],
    },
    {
      id: 'columns',
      label: 'Link columns',
      hint: 'The Treatments column is generated from Verticals, so only its heading is editable here.',
      fields: [
        { key: 'treatmentsHeading', label: 'Treatments heading', type: 'text', default: 'Treatments', width: 'half' },
        { key: 'companyHeading', label: 'Company heading', type: 'text', default: 'Company', width: 'half' },
        {
          key: 'companyLinks', label: 'Company links', type: 'list', itemLabel: 'Link',
          fields: [
            { key: 'label', label: 'Label', type: 'text', width: 'half' },
            { key: 'href', label: 'URL', type: 'text', width: 'half' },
          ],
          default: [
            { label: 'About Kaya', href: '/about' },
            { label: 'Our doctors', href: '/doctors' },
            { label: 'Indulgence', href: '/indulgence' },
            { label: 'Careers', href: '#' },
            { label: 'Press', href: '#' },
          ],
        },
        { key: 'supportHeading', label: 'Support heading', type: 'text', default: 'Support' },
        {
          key: 'supportLinks', label: 'Support links', type: 'list', itemLabel: 'Link',
          fields: [
            { key: 'label', label: 'Label', type: 'text', width: 'half' },
            { key: 'href', label: 'URL', type: 'text', width: 'half' },
          ],
          default: [
            { label: 'Tell us Everything', href: '/tell-us' },
            { label: 'Find A Clinic', href: '/find-us' },
            { label: 'Contact', href: '#' },
            { label: 'FAQ', href: '#' },
            { label: 'WhatsApp', href: 'https://wa.me/971000000000' },
          ],
        },
      ],
    },
    {
      id: 'newsletter',
      label: 'Newsletter',
      fields: [
        { key: 'heading', label: 'Heading', type: 'text', default: 'Stay in touch', width: 'half' },
        { key: 'placeholder', label: 'Input placeholder', type: 'text', default: 'Your email', width: 'half' },
        {
          key: 'note', label: 'Note', type: 'textarea',
          default: 'Monthly updates on new treatments, offers, and longevity insights.',
        },
      ],
    },
    {
      id: 'legal',
      label: 'Legal bar',
      fields: [
        { key: 'copyright', label: 'Copyright line', type: 'text', default: '© 2026 Kaya Wellness & Longevity', width: 'half' },
        { key: 'regionLabel', label: 'Region switcher label', type: 'text', default: 'Region', width: 'half' },
        {
          key: 'links', label: 'Legal links', type: 'list', itemLabel: 'Link',
          fields: [
            { key: 'label', label: 'Label', type: 'text', width: 'half' },
            { key: 'href', label: 'URL', type: 'text', width: 'half' },
          ],
          default: [
            { label: 'Privacy', href: '#' },
            { label: 'Terms', href: '#' },
            { label: 'Cookies', href: '#' },
          ],
        },
      ],
    },
  ],
}

const GLOBAL_GROUP = {
  id: 'global',
  label: 'Global',
  icon: '⚙',
  hint: 'Brand details and copy reused across every page.',
  sections: [
    {
      id: 'brand',
      label: 'Brand',
      fields: [
        { key: 'name', label: 'Brand name', type: 'text', default: 'Kaya Wellness & Longevity' },
        { key: 'logo', label: 'Logo', type: 'image', default: '/Assets/kaya-logo.svg' },
      ],
    },
    {
      id: 'contact',
      label: 'Contact',
      hint: 'The WhatsApp number behind every "WhatsApp us" link on the site.',
      fields: [
        { key: 'whatsapp', label: 'WhatsApp number', type: 'text', default: '971000000000', width: 'half' },
        { key: 'whatsappLabel', label: 'WhatsApp button label', type: 'text', default: 'WhatsApp us', width: 'half' },
      ],
    },
    {
      id: 'bookingCta',
      label: 'Default booking CTA',
      hint: 'Used by any page that does not override the closing CTA.',
      fields: [
        { key: 'headline', label: 'Headline', type: 'text', default: 'Start with', width: 'half' },
        { key: 'headlineEm', label: 'Headline — emphasis', type: 'text', default: 'a conversation.', width: 'half' },
        {
          key: 'sub', label: 'Subtitle', type: 'textarea',
          default: 'No pressure — just the right doctor for what you need.\n23 years · 600,000+ clients · one message away.',
        },
        { key: 'buttonLabel', label: 'Button label', type: 'text', default: 'Book consultation' },
      ],
    },
  ],
}

/** Site-wide content groups (edited under "Footer & Global"). */
export const SITE_GROUPS = [FOOTER_GROUP, GLOBAL_GROUP]

// ── Locations (clinics) ──────────────────────────────────
// Same list as lib/countries.js — kept as a named export because the
// Locations views import it under this name.
export const CLINIC_COUNTRIES = ['UAE', 'KSA', 'Oman']

// Per-day opening hours, matching kaya-nest-api's Clinic.openingHours shape
// (see KA-26) — every entry either a 24h "HH:MM-HH:MM" range or 'closed'.
const ALL_7 = h => ({ sun: h, mon: h, tue: h, wed: h, thu: h, fri: h, sat: h })
const SUN_THU_FRI_SAT = (weekday, weekend) => (
  { sun: weekday, mon: weekday, tue: weekday, wed: weekday, thu: weekday, fri: weekend, sat: weekend }
)
const SAT_THU = (weekday, fri = 'closed') => (
  { sat: weekday, sun: weekday, mon: weekday, tue: weekday, wed: weekday, thu: weekday, fri }
)

/** Clinic records, transcribed from the Find Us section. */
export function seedLocations() {
  return [
    { id: 'abu-dhabi-mall', country: 'UAE', name: 'Abu Dhabi Mall', cityId: 'abu-dhabi', city: 'Abu Dhabi', address: 'Shop No. B65b–B66, First Floor, Abu Dhabi Mall, Abu Dhabi', tel: '02 681 3601', hours: ALL_7('10:00-21:00'), lat: 24.4539, lng: 54.3773 },
    { id: 'al-raha-mall', country: 'UAE', name: 'Al Raha Mall', cityId: 'abu-dhabi', city: 'Abu Dhabi', address: 'Shop F11, First Floor, Al Raha Mall, Abu Dhabi', tel: '02 556 2911', hours: ALL_7('10:00-21:00'), lat: 24.4539, lng: 54.3773 },
    { id: 'al-amiriyyah', country: 'UAE', name: "Al A'Amiriyyah", cityId: 'al-ain', city: 'Al Ain', address: "Villa 6D, 19 Hamdan Ibn Zayed Al Awal St, Al Ameriya, Al Ain", tel: '03 762 0099', hours: ALL_7('10:00-20:00'), lat: 24.2075, lng: 55.7447 },
    { id: 'dubai-marina', country: 'UAE', name: 'Dubai Marina', cityId: 'dubai', city: 'Dubai', address: 'Marina Walk, Dubai Marina, Dubai', tel: '04 450 1001', hours: ALL_7('10:00-22:00'), lat: 25.2048, lng: 55.2708 },
    { id: 'difc', country: 'UAE', name: 'DIFC', cityId: 'dubai', city: 'Dubai', address: 'Gate Village Building 4, DIFC, Dubai', tel: '04 450 1002', hours: SUN_THU_FRI_SAT('09:00-21:00', '10:00-20:00'), lat: 25.2048, lng: 55.2708 },
    { id: 'jlt', country: 'UAE', name: 'Jumeirah Lake Towers', cityId: 'dubai', city: 'Dubai', address: 'Cluster J, JLT, Dubai', tel: '04 450 1003', hours: ALL_7('10:00-21:00'), lat: 25.2048, lng: 55.2708 },
    { id: 'sharjah-city', country: 'UAE', name: 'Sharjah City Centre', cityId: 'sharjah', city: 'Sharjah', address: 'Sharjah City Centre Mall, Sharjah', tel: '06 573 2100', hours: ALL_7('10:00-22:00'), lat: 25.3463, lng: 55.4209 },
    { id: 'fujairah', country: 'UAE', name: 'Fujairah City Centre', cityId: 'fujairah', city: 'Fujairah', address: 'Fujairah City Centre Mall, Fujairah', tel: '09 222 4400', hours: ALL_7('10:00-21:00'), lat: 25.1288, lng: 56.3265 },
    { id: 'rak', country: 'UAE', name: 'Ras Al Khaimah', cityId: 'ras-al-khaimah', city: 'Ras Al Khaimah', address: 'Al Nakheel Mall, Ras Al Khaimah', tel: '07 233 5500', hours: ALL_7('10:00-21:00'), lat: 25.7895, lng: 55.9432 },
    { id: 'riyadh-olaya', country: 'KSA', name: 'Riyadh – Olaya', cityId: 'riyadh', city: 'Riyadh', address: 'Olaya District, King Fahd Road, Riyadh', tel: '+966 11 465 0000', hours: SAT_THU('09:00-21:00'), lat: 24.7136, lng: 46.6753 },
    { id: 'riyadh-park', country: 'KSA', name: 'Riyadh Park Mall', cityId: 'riyadh', city: 'Riyadh', address: 'Riyadh Park Mall, Northern Ring Road, Riyadh', tel: '+966 11 465 0001', hours: SAT_THU('10:00-22:00'), lat: 24.7136, lng: 46.6753 },
    { id: 'jeddah-corniche', country: 'KSA', name: 'Jeddah – Corniche', cityId: 'jeddah', city: 'Jeddah', address: 'Corniche Road, Al Andalus District, Jeddah', tel: '+966 12 661 0000', hours: SAT_THU('09:00-21:00'), lat: 21.4858, lng: 39.1925 },
    { id: 'jeddah-red-sea', country: 'KSA', name: 'Red Sea Mall', cityId: 'jeddah', city: 'Jeddah', address: 'Red Sea Mall, Tahlia Street, Jeddah', tel: '+966 12 661 0001', hours: SAT_THU('10:00-22:00'), lat: 21.4858, lng: 39.1925 },
    { id: 'muscat-qurum', country: 'Oman', name: 'Muscat – Qurum', cityId: 'muscat', city: 'Muscat', address: 'Qurum Commercial Area, Way 2601, Muscat', tel: '+968 24 560 000', hours: SAT_THU('09:00-21:00', '14:00-21:00'), lat: 23.5859, lng: 58.4059 },
    { id: 'muscat-city', country: 'Oman', name: 'City Centre Muscat', cityId: 'muscat', city: 'Muscat', address: 'City Centre Muscat Mall, Al Khuwair, Muscat', tel: '+968 24 560 001', hours: ALL_7('10:00-22:00'), lat: 23.5859, lng: 58.4059 },
  ]
}

/**
 * No `opened` (opening date) or `mapQ` (map search text) — kaya-nest-api's
 * Clinic model has no column for either; see KA-36. `lat`/`lng` replace
 * `mapQ` for the Google Maps preview link.
 */
export function emptyLocation() {
  return {
    id: '', country: 'UAE', cityId: '', city: '', name: '', address: '', tel: '',
    hours: { sun: 'closed', mon: 'closed', tue: 'closed', wed: 'closed', thu: 'closed', fri: 'closed', sat: 'closed' },
    lat: '', lng: '', nameAr: '', addressAr: '',
  }
}

// ── Seed builders ────────────────────────────────────────
/** Deep-copy a field's default so callers can never mutate the schema. */
function defaultValue(field) {
  const d = field.default
  if (Array.isArray(d)) {
    return d.map(item => (item && typeof item === 'object' ? { ...item } : item))
  }
  if (d === undefined) {
    if (field.type === 'toggle') return false
    if (field.type === 'strings' || field.type === 'list') return []
    return ''
  }
  return d
}

/**
 * Build a { sectionId: { EN: { fieldKey: value }, AR: {} } } map from a
 * group's sections. Only English ships with real seed copy — there's no
 * translated content to fabricate for Arabic, so it starts blank.
 */
function seedGroup(group) {
  const out = {}
  for (const section of group.sections) {
    const en = {}
    for (const field of section.fields) {
      en[field.key] = defaultValue(field)
    }
    out[section.id] = { EN: en, AR: {} }
  }
  return out
}

/** Build the { pageId: { sectionId: { fieldKey: value } } } content tree. */
export function seedPages() {
  const out = {}
  for (const page of PAGES) out[page.id] = seedGroup(page)
  return out
}

/** Build the site-wide content tree (footer + global). */
export function seedSite() {
  const out = {}
  for (const group of SITE_GROUPS) out[group.id] = seedGroup(group)
  return out
}

/** An empty item for a `list` field, keyed by its sub-fields. */
export function emptyListItem(field) {
  const out = {}
  for (const sub of field.fields || []) out[sub.key] = ''
  return out
}
