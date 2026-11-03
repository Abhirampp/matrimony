// Dropdown values shared by the profile form and search filters.
export const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Parsi', 'Jewish', 'No Religion', 'Other'];
export const MOTHER_TONGUES = ['Malayalam', 'Tamil', 'Hindi', 'Telugu', 'Kannada', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'Odia', 'English', 'Other'];
export const MARITAL_STATUSES = ['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce'];
export const EDUCATION = ['High School', 'Diploma', 'B.Tech', 'B.E', 'B.Sc', 'B.Com', 'BCA', 'BBA', 'B.A', 'M.Tech', 'M.Sc', 'MCA', 'MBA', 'M.A', 'M.Com', 'MBBS', 'MD', 'CA', 'PhD', 'Other'];
export const INCOMES = ['Below 3 Lakhs', '3-5 Lakhs', '5-10 Lakhs', '10-20 Lakhs', '20+ Lakhs', 'Prefer not to say'];
export const FAMILY_TYPES = ['Nuclear', 'Joint', 'Other'];
export const FAMILY_VALUES = ['Traditional', 'Moderate', 'Liberal'];
export const CREATED_BY = ['Self', 'Parent', 'Sibling', 'Relative', 'Friend'];
export const RESIDENCY = ['Citizen', 'NRI', 'Permanent Resident', 'Work Permit', 'Student Visa'];
export const DIETS = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain'];
export const HABITS = ['No', 'Occasionally', 'Yes'];
export const MANGLIK = ['No', 'Yes', 'Partial', "Don't know"];
// Must match VerificationController.DocumentTypes in the API
export const ID_DOCUMENTS = ['Aadhaar', 'PAN card', 'Passport', 'Driving licence', 'Voter ID'];
export const REPORT_REASONS = ['Fake profile', 'Inappropriate photos', 'Abusive or offensive messages', 'Asking for money', 'Already married', 'Other'];

// These must match the lists in the API (Services/Matching.cs) exactly.
export const RASIS = [
  'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)',
  'Tula (Libra)', 'Vrishchika (Scorpio)', 'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)',
];
export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

export const MAX_PHOTOS = 6;

/** Heights from 4'6" to 7'0", value in cm. */
export const HEIGHTS = Array.from({ length: 31 }, (_, i) => {
  const inches = 54 + i;
  return { cm: Math.round(inches * 2.54), label: `${Math.floor(inches / 12)}' ${inches % 12}"` };
});

export function heightLabel(cm?: number | null): string {
  if (!cm) return '';
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}' ${inches % 12}"`;
}

export function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}
