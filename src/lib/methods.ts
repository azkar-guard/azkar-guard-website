import type { Lang } from "./types";

/** Calculation methods by AlAdhan id, in the order shown in settings. Ids match prayer.ts. */
export const METHODS: { id: number; en: string; ar: string }[] = [
  { id: 3, en: "Muslim World League", ar: "رابطة العالم الإسلامي" },
  { id: 5, en: "Egyptian General Authority of Survey", ar: "الهيئة المصرية العامة للمساحة" },
  { id: 4, en: "Umm Al-Qura University, Makkah", ar: "جامعة أم القرى، مكة المكرمة" },
  { id: 2, en: "Islamic Society of North America (ISNA)", ar: "الجمعية الإسلامية لأمريكا الشمالية (ISNA)" },
  { id: 1, en: "University of Islamic Sciences, Karachi", ar: "جامعة العلوم الإسلامية، كراتشي" },
  { id: 8, en: "Gulf Region", ar: "منطقة الخليج" },
  { id: 9, en: "Kuwait", ar: "الكويت" },
  { id: 10, en: "Qatar", ar: "قطر" },
  { id: 16, en: "Dubai", ar: "دبي" },
  { id: 23, en: "Jordan (Ministry of Awqaf)", ar: "الأردن (وزارة الأوقاف)" },
  { id: 13, en: "Diyanet, Turkey", ar: "رئاسة الشؤون الدينية، تركيا" },
  { id: 12, en: "UOIF, France", ar: "اتحاد المنظمات الإسلامية في فرنسا (UOIF)" },
  { id: 11, en: "MUIS, Singapore", ar: "المجلس الإسلامي في سنغافورة (MUIS)" },
  { id: 17, en: "JAKIM, Malaysia", ar: "جاكيم، ماليزيا (JAKIM)" },
  { id: 20, en: "Kemenag, Indonesia", ar: "وزارة الشؤون الدينية، إندونيسيا" },
  { id: 18, en: "Tunisia", ar: "تونس" },
  { id: 19, en: "Algeria", ar: "الجزائر" },
  { id: 21, en: "Morocco", ar: "المغرب" },
  { id: 14, en: "Spiritual Administration of Muslims of Russia", ar: "الإدارة الدينية لمسلمي روسيا" },
  { id: 15, en: "Moonsighting Committee Worldwide", ar: "لجنة رؤية الهلال العالمية" },
];

export function methodName(id: number, lang: Lang): string {
  const method = METHODS.find((m) => m.id === id) ?? METHODS[0]!;
  return method[lang];
}

/**
 * The method most commonly used in a country, picked when a location is chosen so most
 * people never need to touch the setting. Countries not listed use Muslim World League.
 */
const COUNTRY_METHODS: Record<string, number> = {
  EG: 5, SD: 5, LY: 5, SY: 5, LB: 5, IQ: 5, PS: 5,
  SA: 4, YE: 4,
  AE: 16, KW: 9, QA: 10, BH: 8, OM: 8,
  JO: 23, TR: 13, FR: 12, SG: 11, MY: 17, ID: 20,
  TN: 18, DZ: 19, MA: 21, RU: 14,
  US: 2, CA: 2,
  PK: 1, IN: 1, BD: 1, AF: 1,
};

export function methodForCountry(countryCode: string | undefined): number | undefined {
  return countryCode ? COUNTRY_METHODS[countryCode.toUpperCase()] : undefined;
}
