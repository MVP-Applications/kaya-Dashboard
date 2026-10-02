/**
 * Tell Us Everything — concern lists per main treatment, copied verbatim
 * from the website's hard-coded ConcernFinder (AREA_CONCERNS_EN / _AR) so
 * the preview starts from exactly what is live. Keyed by vertical id;
 * `treatments` are treatment slugs.
 */
export const AREA_CONCERNS = {
  'face-skin': [
    {
      id: 'acne',
      label: 'Acne & Breakouts',
      labelAr: 'حب الشباب والبثور',
      treatments: [
        'chemical-peels',
        'microneedling'
      ]
    },
    {
      id: 'dull',
      label: 'Dullness & Uneven Tone',
      labelAr: 'البهتان وعدم توحد اللون',
      treatments: [
        'chemical-peels',
        'laser-resurfacing',
        'microneedling'
      ]
    },
    {
      id: 'wrinkles',
      label: 'Fine Lines & Ageing',
      labelAr: 'الخطوط الدقيقة والشيخوخة',
      treatments: [
        'botox-fillers',
        'microneedling'
      ]
    },
    {
      id: 'dryness',
      label: 'Dryness & Sensitivity',
      labelAr: 'الجفاف والحساسية',
      treatments: [
        'chemical-peels',
        'mesotherapy'
      ]
    },
    {
      id: 'dark-spots',
      label: 'Pigmentation',
      labelAr: 'التصبغات',
      treatments: [
        'laser-resurfacing',
        'chemical-peels'
      ]
    }
  ],
  body: [
    {
      id: 'belly-fat',
      label: 'Stubborn Fat',
      labelAr: 'الدهون العنيدة',
      treatments: [
        'cryolipolysis',
        'hifu-body'
      ]
    },
    {
      id: 'cellulite',
      label: 'Cellulite',
      labelAr: 'السيلوليت',
      treatments: [
        'radiofrequency',
        'mesotherapy',
        'pressotherapy'
      ]
    },
    {
      id: 'loose-skin',
      label: 'Loose or Sagging Skin',
      labelAr: 'ترهل الجلد',
      treatments: [
        'radiofrequency',
        'hifu-body'
      ]
    },
    {
      id: 'reshape',
      label: 'Body Reshaping',
      labelAr: 'إعادة تشكيل الجسم',
      treatments: [
        'cryolipolysis',
        'radiofrequency',
        'hifu-body'
      ]
    },
    {
      id: 'bloated',
      label: 'Bloating & Water Retention',
      labelAr: 'الانتفاخ واحتباس الماء',
      treatments: [
        'pressotherapy',
        'mesotherapy'
      ]
    }
  ],
  hair: [
    {
      id: 'thinning',
      label: 'Thinning Hair',
      labelAr: 'ترقق الشعر',
      treatments: [
        'prp-hair'
      ]
    },
    {
      id: 'hair-loss',
      label: 'Hair Loss or Receding Hairline',
      labelAr: 'تساقط الشعر أو تراجع خط الشعر',
      treatments: [
        'prp-hair'
      ]
    },
    {
      id: 'unwanted',
      label: 'Unwanted Hair Removal',
      labelAr: 'إزالة الشعر غير المرغوب فيه',
      treatments: [
        'laser-hair-removal'
      ]
    }
  ],
  wellness: [
    {
      id: 'fatigue',
      label: 'Fatigue & Low Energy',
      labelAr: 'التعب وانخفاض الطاقة',
      treatments: [
        'iv-drip-therapy',
        'nad-therapy',
        'biomarker-testing'
      ]
    },
    {
      id: 'ageing',
      label: 'Biological Ageing',
      labelAr: 'الشيخوخة البيولوجية',
      treatments: [
        'longevity-programme',
        'nad-therapy',
        'peptide-protocols'
      ]
    },
    {
      id: 'mental',
      label: 'Mental Clarity & Focus',
      labelAr: 'الوضوح الذهني والتركيز',
      treatments: [
        'nad-therapy',
        'hormonal-balance',
        'biomarker-testing'
      ]
    },
    {
      id: 'health',
      label: 'Health Marker Tracking',
      labelAr: 'تتبع المؤشرات الصحية',
      treatments: [
        'biomarker-testing',
        'longevity-programme'
      ]
    },
    {
      id: 'hormones',
      label: 'Hormonal Imbalance',
      labelAr: 'اختلال التوازن الهرموني',
      treatments: [
        'hormonal-balance',
        'biomarker-testing'
      ]
    }
  ],
  mens: [
    {
      id: 'mens-hair-loss',
      label: 'Hair Loss or Thinning',
      labelAr: 'تساقط الشعر أو ترققه',
      treatments: [
        'prp-hair'
      ]
    },
    {
      id: 'mens-unwanted',
      label: 'Unwanted Hair Removal',
      labelAr: 'إزالة الشعر غير المرغوب فيه',
      treatments: [
        'laser-hair-removal'
      ]
    },
    {
      id: 'mens-wrinkles',
      label: 'Fine Lines & Ageing',
      labelAr: 'الخطوط الدقيقة والشيخوخة',
      treatments: [
        'botox-fillers'
      ]
    },
    {
      id: 'mens-fat',
      label: 'Stubborn Fat',
      labelAr: 'الدهون العنيدة',
      treatments: [
        'cryolipolysis'
      ]
    },
    {
      id: 'mens-hormones',
      label: 'Low Energy or Hormonal Imbalance',
      labelAr: 'انخفاض الطاقة أو اختلال الهرمونات',
      treatments: [
        'hormonal-balance'
      ]
    }
  ],
  surgery: [
    {
      id: 'nose-shape',
      label: 'Nose Shape & Symmetry',
      labelAr: 'شكل الأنف وتناسقه',
      treatments: [
        'rhinoplasty'
      ]
    },
    {
      id: 'excess-fat',
      label: 'Excess Body Fat',
      labelAr: 'الدهون الزائدة',
      treatments: [
        'liposuction'
      ]
    },
    {
      id: 'loose-abdomen',
      label: 'Loose Abdominal Skin',
      labelAr: 'ترهل جلد البطن',
      treatments: [
        'tummy-tuck'
      ]
    },
    {
      id: 'breast-shape',
      label: 'Breast Size or Shape',
      labelAr: 'حجم أو شكل الثدي',
      treatments: [
        'breast-augmentation'
      ]
    },
    {
      id: 'eyelid-sagging',
      label: 'Sagging Eyelids',
      labelAr: 'ترهل الجفون',
      treatments: [
        'eyelid-surgery'
      ]
    },
    {
      id: 'facial-sagging',
      label: 'Facial Sagging & Ageing',
      labelAr: 'ترهل الوجه والشيخوخة',
      treatments: [
        'face-lift'
      ]
    }
  ]
}
