/**
 * Character limits for dashboard text fields, mirrored from the API's admin
 * DTOs (kaya-nest-api src/modules/<module>/dto/admin). The API rejects
 * anything longer, so the dashboard stops input at the same limit and shows a
 * counter (shared/components/LimitedInput.js).
 *
 * When a limit changes, change it in the API DTO and here together. Keys are
 * the API field names, so each one can be found in its DTO.
 */
export const LIMITS = {
  // treatments/dto/admin/create-treatment.dto.ts
  treatment: {
    title: 200,
    subtitle: 500,
    summary: 1000,
    howItWorks: 2000,
    duration: 100,
    sessions: 100,
    interval: 100,
    downtimeNotes: 500,
    downtimeSeverity: 100,
    benefitIcon: 100,
    benefitTitle: 200,
    benefitDescription: 500,
  },
  // pillars/dto/admin/create-pillar.dto.ts
  vertical: {
    name: 100,
    hintText: 500,
    heroEyebrow: 100,
    heroHeadline: 200,
    heroHeadlineEm: 200,
    heroSub: 500,
    trustPointIcon: 20,
    trustPointLabel: 80,
    trustPointHint: 200,
    statValue: 20,
    statLabel: 80,
  },
  // doctors/dto/admin/create-doctor.dto.ts
  doctor: {
    name: 200,
    title: 200,
    bio: 2000,
    photoUrl: 500,
  },
  // blogs/dto/admin/create-blog.dto.ts
  blog: {
    title: 200,
    excerpt: 500,
    metaTitle: 200,
    metaDescription: 500,
    keyword: 100,
    ogTitle: 200,
    ogDescription: 500,
    authorName: 200,
    canonicalUrl: 500,
    ogImageUrl: 500,
    blockText: 10000,
  },
  // blog-categories/dto/admin/create-blog-category.dto.ts
  blogCategory: {
    name: 100,
  },
  // categories/dto/admin/create-category.dto.ts
  category: {
    name: 100,
    description: 500,
  },
  // clinics/dto/admin/create-clinic.dto.ts
  clinic: {
    name: 200,
    address: 500,
    phone: 50,
  },
  // indulgence/dto/admin/create-indulgence.dto.ts
  indulgence: {
    title: 200,
    subtitle: 200,
    description: 1000,
    badge: 50,
    redemptionTerms: 1000,
  },
  // locations/dto/admin/create-country.dto.ts
  country: {
    name: 100,
    code: 10,
  },
  // locations/dto/admin/create-city.dto.ts
  city: {
    name: 100,
  },
  // tell-us/dto/tell-us.dto.ts
  tellUs: {
    eyebrow: 200,
    heading: 300,
    sub: 500,
    notSureLabel: 200,
    optionLabel: 200,
  },
  // pages/dto/admin/page-settings.dto.ts
  pageSettings: {
    navLabel: 60,
    title: 120,
    seoTitle: 200,
    seoDescription: 500,
  },
}
