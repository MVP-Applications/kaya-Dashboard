/**
 * Sample blog content for preview mode, so the Blog screen isn't empty
 * without a backend. The same posts kaya-nest-api's seed creates (they began
 * as the website design's local posts). `author` is a doctor slug — matched
 * against the preview doctors, falling back to `authorName`.
 */
export const BLOG_CATEGORIES = [
  { slug: 'skin', name: 'Skin', nameAr: 'البشرة' },
  { slug: 'body', name: 'Body', nameAr: 'الجسم' },
  { slug: 'longevity', name: 'Longevity', nameAr: 'إطالة العمر' },
  { slug: 'hair', name: 'Hair', nameAr: 'الشعر' },
  { slug: 'surgery', name: 'Surgery', nameAr: 'الجراحة' },
]

export const BLOGS = [
  {
    slug: 'protecting-your-skin-in-gcc-summer',
    category: 'skin',
    image: '/Assets/maintreatment 1.jpg',
    author: 'dr-layla-al-mansouri',
    authorName: 'Dr. Layla Al Mansouri',
    publishedAt: '2026-09-10',
    featured: true,
    title: 'Protecting your skin through a GCC summer',
    titleAr: 'كيف تحمي بشرتك خلال صيف الخليج',
    excerpt: 'High UV, heat and humidity put darker skin types at real risk of pigmentation. Here is the dermatologist-approved routine that actually holds up at 45°C.',
    excerptAr: 'الأشعة فوق البنفسجية العالية والحرارة والرطوبة تعرّض البشرة الداكنة لخطر التصبغ. إليك الروتين الذي يوصي به أطباء الجلد.',
    body: [
      {
        type: 'p',
        text: 'Summer in the Gulf is not a normal summer. UV index regularly passes 11, humidity swings from desert-dry to coastal-heavy, and most of us move between 45°C streets and 20°C air-conditioning several times a day. For skin, that constant stress shows up as pigmentation, dehydration and breakouts.',
      },
      { type: 'h2', text: 'Why GCC skin needs a different approach' },
      {
        type: 'p',
        text: 'Most of our patients have Fitzpatrick III–VI skin. Melanin gives natural protection against burning, but it is also far more reactive: heat and visible light alone can trigger melasma and post-inflammatory hyperpigmentation, even without a sunburn.',
      },
      {
        type: 'quote',
        text: 'Sunscreen is not a beach product here. It is a daily, indoor-and-outdoor product — reapplied at midday.',
      },
      { type: 'h2', text: 'The routine we recommend' },
      {
        type: 'p',
        text: 'Morning: a gentle cleanser, a vitamin C or niacinamide serum, a light gel moisturiser and a broad-spectrum SPF 50 with iron oxides — tinted formulas protect against visible light as well as UV. Evening: cleanse twice, then alternate a retinoid with a hydrating serum.',
      },
      {
        type: 'p',
        text: 'If pigmentation has already set in, topical care alone is slow. In clinic we combine chemical peels, microneedling or low-energy laser with a strict home routine for faster, safer results on darker skin.',
      },
      { type: 'h2', text: 'When to see a dermatologist' },
      {
        type: 'p',
        text: 'Book a consultation if dark patches keep spreading, if over-the-counter brighteners irritate your skin, or if you are planning laser treatment — settings for darker skin must be chosen by a physician.',
      },
    ],
    metaTitle: 'Summer Skincare for GCC Skin | Dermatologist Guide',
    metaDescription: 'How to prevent pigmentation and protect Fitzpatrick III–VI skin through a GCC summer — the SPF, serums and in-clinic treatments dermatologists recommend.',
    keywords: ['summer skincare UAE', 'pigmentation', 'melasma', 'sunscreen', 'dark skin'],
  },
  {
    slug: 'what-your-biological-age-says',
    category: 'longevity',
    image: '/Assets/maintreatment 5.jpg',
    author: 'dr-sara-qasim',
    authorName: 'Dr. Sara Qasim',
    publishedAt: '2026-08-28',
    featured: false,
    title: 'What your biological age really says about you',
    titleAr: 'ماذا يخبرك عمرك البيولوجي عنك حقًا',
    excerpt: 'Your passport says one number, your cells say another. How biomarker testing works — and what you can realistically change.',
    excerptAr: 'جواز سفرك يقول رقمًا وخلاياك تقول رقمًا آخر. كيف يعمل فحص المؤشرات الحيوية وما الذي يمكنك تغييره فعلًا.',
    body: [
      {
        type: 'p',
        text: 'Chronological age is simply how long you have been alive. Biological age estimates how well your body is actually functioning — and two people born the same year can be a decade apart.',
      },
      { type: 'h2', text: 'How it is measured' },
      {
        type: 'p',
        text: 'We combine blood biomarkers (glucose control, inflammation, lipids, hormones, organ function) with body composition, grip strength and cardiovascular fitness. Together they give a far more useful picture than any single test.',
      },
      {
        type: 'quote',
        text: 'The number itself matters less than the direction it moves after six months.',
      },
      { type: 'h2', text: 'What moves the needle' },
      {
        type: 'p',
        text: 'Sleep, strength training and blood-sugar control have the strongest evidence. Targeted supplementation, IV therapy and hormonal optimisation can help — but only once the basics are in place and only where testing shows a real deficit.',
      },
      {
        type: 'p',
        text: 'Every Kaya longevity programme starts with a full assessment and a retest at six months, so you can see exactly what changed.',
      },
    ],
    metaTitle: 'Biological Age Testing Explained | Kaya Longevity',
    metaDescription: 'What biological age means, how biomarker testing measures it, and the evidence-based changes that actually lower it.',
    keywords: ['biological age', 'biomarker testing', 'longevity Dubai', 'healthy ageing'],
  },
  {
    slug: 'cryolipolysis-vs-hifu',
    category: 'body',
    image: '/Assets/maintreatment 3.jpg',
    author: 'dr-khalid-al-farsi',
    authorName: 'Dr. Khalid Al Farsi',
    publishedAt: '2026-08-14',
    featured: false,
    title: 'Cryolipolysis vs HIFU: which is right for you?',
    titleAr: 'التجميد الدهني أم الهايفو: أيهما يناسبك؟',
    excerpt: 'Both promise non-surgical contouring, but they work in very different ways. A body specialist breaks down who each one suits.',
    excerptAr: 'كلاهما يَعِد بنحت الجسم دون جراحة، لكن طريقة عملهما مختلفة تمامًا. أخصائي الجسم يوضح لمن يناسب كل منهما.',
    body: [
      {
        type: 'p',
        text: 'Cryolipolysis freezes fat cells so the body clears them naturally over eight to twelve weeks. HIFU uses focused ultrasound to heat deeper tissue, reducing fat and tightening skin at the same time.',
      },
      { type: 'h2', text: 'Choose cryolipolysis if…' },
      {
        type: 'p',
        text: 'You have a distinct, pinchable pocket of fat — lower abdomen, flanks, under the chin — and your skin elasticity is good.',
      },
      { type: 'h2', text: 'Choose HIFU if…' },
      {
        type: 'p',
        text: 'Your main concern is mild laxity alongside a little stubborn fat, or you want to firm areas like the arms and knees where freezing is less effective.',
      },
      {
        type: 'quote',
        text: 'For many patients the best result comes from combining both across a single programme.',
      },
      {
        type: 'p',
        text: 'Neither is a weight-loss treatment. They work best within a few kilos of your goal weight, and a consultation will tell you which — or which combination — makes sense.',
      },
    ],
    metaTitle: 'Cryolipolysis vs HIFU: Which Body Treatment Is Right for You?',
    metaDescription: 'A body contouring specialist compares cryolipolysis and HIFU — how each works, who each suits, and when to combine them.',
    keywords: ['cryolipolysis', 'HIFU', 'fat freezing', 'body contouring UAE'],
  },
  {
    slug: 'understanding-hair-loss-in-women',
    category: 'hair',
    image: '/Assets/subtreatment 4.jpg',
    author: 'dr-nadia-ibrahim',
    authorName: 'Dr. Nadia Ibrahim',
    publishedAt: '2026-07-30',
    featured: false,
    title: 'Understanding hair loss in women',
    titleAr: 'فهم تساقط الشعر لدى النساء',
    excerpt: 'Postpartum shedding, iron deficiency, hormones — female hair loss has many causes, and the right treatment depends on finding yours.',
    excerptAr: 'تساقط ما بعد الولادة ونقص الحديد والهرمونات — لتساقط الشعر لدى النساء أسباب كثيرة، والعلاج المناسب يبدأ بمعرفة السبب.',
    body: [
      {
        type: 'p',
        text: 'Losing 50 to 100 hairs a day is normal. When shedding clearly increases, or your parting and ponytail start to thin, it is worth investigating rather than waiting.',
      },
      { type: 'h2', text: 'The most common causes we see' },
      {
        type: 'p',
        text: 'Iron and vitamin D deficiency are extremely common in the GCC and are a frequent, very treatable cause. Others include thyroid imbalance, PCOS, postpartum telogen effluvium and female-pattern hair loss.',
      },
      { type: 'h2', text: 'How we treat it' },
      {
        type: 'p',
        text: 'Treatment starts with blood work and a scalp assessment. From there, options range from correcting deficiencies and topical therapy to PRP, which uses growth factors from your own blood to support follicles.',
      },
      {
        type: 'quote',
        text: 'Hair responds slowly — give any treatment three to six months before judging it.',
      },
    ],
    metaTitle: 'Female Hair Loss: Causes & Treatments | Kaya',
    metaDescription: 'Iron deficiency, hormones, postpartum shedding — the common causes of hair loss in women and how PRP and medical treatment help.',
    keywords: ['female hair loss', 'hair thinning', 'PRP hair', 'postpartum hair loss'],
  },
  {
    slug: 'rhinoplasty-recovery-guide',
    category: 'surgery',
    image: '/Assets/maintreatment 9.jpg',
    author: 'dr-omar-hassan',
    authorName: 'Dr. Omar Hassan',
    publishedAt: '2026-07-12',
    featured: false,
    title: 'Your rhinoplasty recovery, week by week',
    titleAr: 'التعافي من تجميل الأنف أسبوعًا بأسبوع',
    excerpt: 'What to expect from the first night to the final result — and the small habits that make recovery smoother.',
    excerptAr: 'ما الذي تتوقعه من الليلة الأولى حتى النتيجة النهائية، والعادات البسيطة التي تجعل التعافي أسهل.',
    body: [
      {
        type: 'p',
        text: 'Rhinoplasty recovery is gradual. Most patients are back to work within two weeks, but the final shape takes up to a year to fully settle.',
      },
      { type: 'h2', text: 'Week one' },
      {
        type: 'p',
        text: 'Expect swelling and bruising around the eyes, a splint on the nose and some congestion. Sleep with your head elevated, avoid bending and keep up with cold compresses.',
      },
      { type: 'h2', text: 'Weeks two to six' },
      {
        type: 'p',
        text: 'The splint comes off, bruising fades and you will look presentable. Avoid glasses resting on the bridge, contact sports and heavy exercise.',
      },
      { type: 'h2', text: 'Months three to twelve' },
      {
        type: 'p',
        text: 'Residual swelling — especially at the tip — slowly resolves. This is when the refined, natural result really shows.',
      },
      {
        type: 'quote',
        text: 'Patience is part of the procedure. The nose you see at one month is not the nose you will have at one year.',
      },
    ],
    metaTitle: 'Rhinoplasty Recovery Timeline, Week by Week',
    metaDescription: 'A plastic surgeon\'s week-by-week guide to rhinoplasty recovery — swelling, splint removal, returning to work and the final result.',
    keywords: ['rhinoplasty recovery', 'nose job Dubai', 'plastic surgery recovery'],
  },
  {
    slug: 'botox-myths',
    category: 'skin',
    image: '/Assets/subtreatment 2.jpg',
    author: 'dr-amira-benali',
    authorName: 'Dr. Amira Benali',
    publishedAt: '2026-06-25',
    featured: false,
    title: 'Five Botox myths, answered by a doctor',
    titleAr: 'خمس خرافات عن البوتوكس يجيب عنها طبيب',
    excerpt: 'Frozen faces, lifelong commitment, "too young to start" — we separate what is true from what is not.',
    excerptAr: 'الوجه المتجمد والالتزام مدى الحياة و"أصغر من أن تبدأ" — نفصل الحقيقة عن الخرافة.',
    body: [
      {
        type: 'p',
        text: 'Botulinum toxin is one of the most studied treatments in aesthetic medicine, yet it still attracts a lot of misconceptions.',
      },
      { type: 'h2', text: '"It will freeze my face"' },
      {
        type: 'p',
        text: 'Only when over-dosed. A skilled physician softens specific muscles while keeping natural expression.',
      },
      { type: 'h2', text: '"Once I start, I can never stop"' },
      {
        type: 'p',
        text: 'Effects wear off in three to four months. If you stop, your face simply returns to how it would have looked anyway.',
      },
      { type: 'h2', text: '"It is only for wrinkles"' },
      { type: 'p', text: 'It is also used for excessive sweating, jaw clenching and migraines.' },
      {
        type: 'quote',
        text: 'The injector matters more than the product. Always ask who is holding the needle.',
      },
    ],
    metaTitle: '5 Botox Myths Debunked by a Doctor | Kaya',
    metaDescription: 'Frozen faces, lifelong commitment, starting too young — a physician answers the most common Botox myths.',
    keywords: ['botox myths', 'botox Dubai', 'anti-wrinkle injections'],
  },
]
