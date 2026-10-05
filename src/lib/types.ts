export type Session = "morning" | "evening";
export type Level = "small" | "medium" | "full";
export type Lang = "en" | "ar";
export type Theme = "system" | "light" | "dark";
export type TextSize = "regular" | "medium" | "large";

/** One entry of src/data/azkar.json. */
export interface Dhikr {
  id: string;
  session: Session | "both";
  arabic_text: string;
  required_count: number;
  /** Smallest level that includes this dhikr. Levels are cumulative: small ⊂ medium ⊂ full. */
  level: Level;
  source: string;
  /** English translation of meaning. */
  translation_en: string;
  /** Latin transliteration for readers who cannot read Arabic script. */
  transliteration: string;
  virtue_note?: string;
  /** Arabic virtue note: a verbatim hadith excerpt with reference, or a paraphrase marked «بمعناه». */
  virtue_note_ar?: string;
}

/** Where prayer times are computed for. `name` is only for display (e.g. "Cairo, Egypt"). */
export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  /** Arabic city name, when the location was picked from the offline city list. */
  nameAr?: string;
}

export interface Settings {
  location: Location | null;
  /** AlAdhan calculation method id. */
  method: number;
  level: Level;
  /** Interface language. The dhikr itself is always shown in Arabic. */
  language: Lang;
  theme: Theme;
  /** Scales all text in the app. */
  textSize: TextSize;
}

/** Prayer times for one calendar date, as epoch milliseconds. */
export interface PrayerDay {
  fajr: number;
  maghrib: number;
}

/** An active Azkar window. Morning = Fajr → Maghrib, Evening = Maghrib → next Fajr. */
export interface AzkarWindow {
  session: Session;
  /** Date the window started on (YYYY-MM-DD); an evening after midnight belongs to the previous date. */
  date: string;
  start: number;
  end: number;
}

/** Tap progress for the current window only; reset when the window changes. */
export interface Progress {
  windowKey: string;
  remaining: Record<string, number>;
}

/** Completion timestamps (epoch ms) per date and session. */
export type History = Record<string, Partial<Record<Session, number>>>;
