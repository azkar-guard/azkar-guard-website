import type { History, Progress, Settings } from "./types";

/** Persistent state, kept in localStorage on this device only. */
interface Store {
  settings: Settings;
  progress: Progress;
  history: History;
}

export type StoreKey = keyof Store;

const PREFIX = "azkar-guard:";
const CHANGE_EVENT = "azkar-guard:change";

export const DEFAULT_SETTINGS: Settings = {
  location: null,
  method: 3, // Muslim World League
  level: "small",
  language: "en",
  theme: "system",
  textSize: "regular",
};

/** Text scale per size setting, relative to the regular size. */
export const TEXT_SCALE: Record<Settings["textSize"], number> = {
  regular: 1,
  medium: 1.15,
  large: 1.35,
};

/** The browser language decides the default interface language until the user picks one. */
function defaultLanguage(): Settings["language"] {
  return navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export async function get<K extends StoreKey>(key: K): Promise<Store[K] | undefined> {
  const raw = localStorage.getItem(PREFIX + key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as Store[K];
  } catch {
    return undefined; // corrupt value: behave as if unset
  }
}

export async function set<K extends StoreKey>(key: K, value: Store[K]): Promise<void> {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  // The "storage" event only fires in other tabs, so notify this one too.
  window.dispatchEvent(new CustomEvent<StoreKey>(CHANGE_EVENT, { detail: key }));
}

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, language: defaultLanguage(), ...(await get("settings")) };
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await set("settings", next);
  return next;
}

/** Subscribe to changes of the given keys, from this tab or another one. Returns an unsubscribe function. */
export function onChange(keys: StoreKey[], callback: () => void): () => void {
  const local = (e: Event) => {
    if (keys.includes((e as CustomEvent<StoreKey>).detail)) callback();
  };
  const other = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX) && keys.includes(e.key.slice(PREFIX.length) as StoreKey)) callback();
  };
  window.addEventListener(CHANGE_EVENT, local);
  window.addEventListener("storage", other);
  return () => {
    window.removeEventListener(CHANGE_EVENT, local);
    window.removeEventListener("storage", other);
  };
}
