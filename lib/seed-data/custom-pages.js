/**
 * One sample page for preview mode, so the page builder has something to
 * open before a backend exists. Built with the Campaign template's blocks.
 */
export const CUSTOM_PAGES = [
  {
    id: 'summer-glow',
    slug: 'summer-glow',
    template: 'campaign',
    visible: true,
    title: 'Summer Glow', titleAr: 'توهج الصيف',
    seoTitle: 'Summer Glow offer | Kaya', seoTitleAr: '',
    seoDescription: '20% off laser resurfacing and chemical peels until 31 August.', seoDescriptionAr: '',
    updatedAt: '2026-09-10T09:00:00.000Z',
    blocks: [
      {
        id: 'blk-sg-hero', type: 'hero', hidden: false,
        data: {
          eyebrow: 'Until 31 August', eyebrowAr: 'حتى 31 أغسطس',
          heading: 'Your summer *glow*, 20% off', headingAr: 'توهج *صيفك* بخصم 20٪',
          sub: 'Laser resurfacing and chemical peels, planned by our dermatologists.', subAr: '',
          image: '/Assets/banner 2.jpg', align: 'center',
          buttonLabel: 'Book your consultation', buttonLabelAr: 'احجز استشارتك', buttonAction: 'booking', buttonLink: '',
        },
      },
      {
        id: 'blk-sg-text', type: 'text', hidden: false,
        data: {
          heading: 'The offer', headingAr: '',
          body: 'Book any laser resurfacing or chemical peel session before 31 August and save 20%.\n\nThe offer applies to new and returning patients at every Kaya clinic in the UAE.', bodyAr: '',
        },
      },
      {
        id: 'blk-sg-treatments', type: 'treatments', hidden: false,
        data: { heading: 'Included *treatments*', headingAr: '', sub: '', subAr: '', treatments: ['laser-resurfacing', 'chemical-peels'] },
      },
      {
        id: 'blk-sg-cta', type: 'cta', hidden: false,
        data: {
          heading: 'Don’t miss *out*', headingAr: '', sub: 'Slots fill quickly in the last weeks of summer.', subAr: '',
          buttonLabel: 'Book now', buttonLabelAr: 'احجز الآن', buttonAction: 'booking', buttonLink: '',
        },
      },
      {
        id: 'blk-sg-faq', type: 'faq', hidden: false,
        data: {
          heading: 'Terms & *conditions*', headingAr: '',
          items: [
            { question: 'Can I combine this with other offers?', questionAr: '', answer: 'No — one offer per treatment session.', answerAr: '' },
            { question: 'Which clinics take part?', questionAr: '', answer: 'Every Kaya clinic in the UAE.', answerAr: '' },
          ],
        },
      },
    ],
  },
]
