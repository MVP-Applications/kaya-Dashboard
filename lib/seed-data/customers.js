/**
 * Sample website accounts for preview mode, in the exact shape the website's
 * GET /customer/me returns (kaya-website/lib/api/auth.js), plus the two
 * fields only staff see: `status` and `lastSignInAt`.
 *
 * Everyone here is fictional. Contact details use example.com addresses and
 * zero-filled numbers, like the sample enquiries — several deliberately
 * match those enquiries so a profile's history has something to show.
 * Medical answers exist only where `healthConsentAt` is set, mirroring the
 * website: without consent they are never stored.
 *
 * Dates are days before load time, so "joined 3 days ago" stays sensible.
 */
const base = {
  email: null, phone: null, fullName: null, dateOfBirth: null, gender: null,
  heightCm: null, weightKg: null,
  allergies: null, medications: null, medicalConditions: null, isPregnant: null, isBreastfeeding: null,
  healthConsentAt: null, authProviders: [], status: 'ACTIVE',
}

export const CUSTOMERS = [
  {
    ...base, id: 'cus-001', joinedDaysAgo: 2, lastSeenDaysAgo: 0,
    fullName: 'Noura Al Hashimi', email: 'noura@example.com', phone: '+971560000009',
    dateOfBirth: '1992-04-18', gender: 'FEMALE', heightCm: 164, weightKg: 58,
    allergies: 'Penicillin', medications: 'Iron supplement', medicalConditions: 'None', isPregnant: false, isBreastfeeding: true,
    healthConsentDaysAgo: 2, authProviders: ['PHONE', 'GOOGLE'],
  },
  {
    ...base, id: 'cus-002', joinedDaysAgo: 40, lastSeenDaysAgo: 1,
    fullName: 'Fatima Al Zahra', email: 'fatima@example.com', phone: '+971500000001',
    dateOfBirth: '1988-11-02', gender: 'FEMALE', heightCm: 170, weightKg: 63,
    allergies: 'None', medications: 'None', medicalConditions: 'Mild eczema', isPregnant: false, isBreastfeeding: false,
    healthConsentDaysAgo: 38, authProviders: ['APPLE'],
  },
  {
    ...base, id: 'cus-003', joinedDaysAgo: 12, lastSeenDaysAgo: 4,
    fullName: 'Khalid Mansoor', email: 'khalid@example.com', phone: '+968910000005',
    dateOfBirth: '1979-06-21', gender: 'MALE', heightCm: 181, weightKg: 88,
    allergies: 'Lidocaine', medications: 'Blood pressure tablets (amlodipine)', medicalConditions: 'High blood pressure',
    healthConsentDaysAgo: 12, authProviders: ['PHONE'],
  },
  {
    ...base, id: 'cus-004', joinedDaysAgo: 75, lastSeenDaysAgo: 20,
    fullName: 'Layla Ibrahim', email: 'layla@example.com', phone: '+971500000006',
    dateOfBirth: '1995-01-30', gender: 'FEMALE', heightCm: 158, weightKg: 52,
    authProviders: ['GOOGLE'],
  },
  {
    ...base, id: 'cus-005', joinedDaysAgo: 5, lastSeenDaysAgo: 5,
    fullName: 'Reem Haddad', email: 'reem@example.com', phone: '+966500000003',
    dateOfBirth: '1990-09-09', gender: 'FEMALE',
    authProviders: ['SAMSUNG'],
  },
  {
    ...base, id: 'cus-006', joinedDaysAgo: 1, lastSeenDaysAgo: 1,
    phone: '+971550000002', authProviders: ['PHONE'],
  },
  {
    ...base, id: 'cus-007', joinedDaysAgo: 60, lastSeenDaysAgo: 2,
    fullName: 'Aisha Noor', email: 'aisha@example.com', phone: '+971520000004',
    dateOfBirth: '1983-03-14', gender: 'FEMALE', heightCm: 166, weightKg: 70,
    allergies: 'Latex', medications: 'Levothyroxine', medicalConditions: 'Hypothyroidism', isPregnant: false, isBreastfeeding: false,
    healthConsentDaysAgo: 58, authProviders: ['PHONE', 'APPLE'],
  },
  {
    ...base, id: 'cus-008', joinedDaysAgo: 18, lastSeenDaysAgo: 18,
    fullName: 'Mariam Al Suwaidi', email: 'mariam.al.suwaidi@example.com',
    dateOfBirth: '1997-07-07', gender: 'FEMALE', heightCm: 162,
    authProviders: ['GOOGLE'],
  },
  {
    ...base, id: 'cus-009', joinedDaysAgo: 120, lastSeenDaysAgo: 90, status: 'DISABLED',
    fullName: 'Sami Tariq', email: 'sami@example.com', phone: '+966550000007',
    dateOfBirth: '1986-12-01', gender: 'MALE', heightCm: 176, weightKg: 81,
    authProviders: ['PHONE'],
  },
  {
    ...base, id: 'cus-010', joinedDaysAgo: 9, lastSeenDaysAgo: 3,
    fullName: 'Hind Al Marzooqi', email: 'hind.al.marzooqi@example.com', phone: '+971500000010',
    dateOfBirth: '2000-02-25', gender: 'FEMALE', heightCm: 168, weightKg: 60,
    allergies: 'None', medications: 'None', medicalConditions: 'None', isPregnant: false, isBreastfeeding: false,
    healthConsentDaysAgo: 9, authProviders: ['SAMSUNG', 'PHONE'],
  },
]
