import { estimateMinutes, LEVELS } from "../lib/azkar";
import { t, type I18nKey } from "../lib/i18n";
import { allCities, locationFromTimeZone, nearestCity, searchCities, systemTimeZone, type City } from "../lib/locations";
import { METHODS, methodForCountry } from "../lib/methods";
import { disableReminders, enableReminders, pushSupport, remindersConfigured, remindersEnabled } from "../lib/push";
import { getSettings, onChange, updateSettings } from "../lib/storage";
import type { Lang, Location, Settings, TextSize, Theme } from "../lib/types";
import { h } from "./dom";

const SOURCE_URL = "https://github.com/azkar-guard/azkar-guard-website";

/** Display name for a location in the interface language. */
export function locationName(location: Location, lang: Lang): string {
  if (lang === "ar" && location.nameAr) return location.nameAr;
  return location.name ?? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

function cityLocation(city: City): Location {
  return { latitude: city.latitude, longitude: city.longitude, name: `${city.name}, ${city.country}`, nameAr: city.arabic || undefined };
}

/**
 * Save a location, switch to the country's usual calculation method if we know it, and go
 * back to the checklist: picking a location is almost always the step before reading the Azkar.
 */
async function chooseLocation(location: Location, countryCode: string | undefined): Promise<void> {
  const method = methodForCountry(countryCode);
  await updateSettings(method === undefined ? { location } : { location, method });
  window.location.hash = "#/";
}

/** Mounts the settings page into `root`. Returns a function that stops its re-renders. */
export function mountSettings(root: HTMLElement): () => void {
  // Survives re-renders, so a settings change doesn't wipe what the user typed or the GPS status.
  let query = "";
  let gpsStatus: { key: I18nKey; vars?: Record<string, string>; error?: boolean } | null = null;
  let reminderStatus: { key: I18nKey; vars?: Record<string, string>; error?: boolean } | null = null;

  const render = async () => {
    const settings = await getSettings();
    root.replaceChildren(view(settings, await remindersEnabled()));
  };

  const locateWithGps = () => {
    if (!("geolocation" in navigator)) {
      gpsStatus = { key: "settings.gpsUnavailable", error: true };
      void render();
      return;
    }
    gpsStatus = { key: "settings.gpsLocating" };
    void render();
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const city = nearestCity(coords.latitude, coords.longitude);
        const location: Location = {
          latitude: Number(coords.latitude.toFixed(4)),
          longitude: Number(coords.longitude.toFixed(4)),
          name: city ? t("en", "settings.near", { name: `${city.name}, ${city.country}` }) : undefined,
          nameAr: city?.arabic ? t("ar", "settings.near", { name: city.arabic }) : undefined,
        };
        gpsStatus = null;
        void chooseLocation(location, city?.countryCode);
      },
      (err) => {
        gpsStatus = { key: "settings.gpsFailed", vars: { error: err.message }, error: true };
        void render();
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 },
    );
  };

  const locationSection = (settings: Settings): HTMLElement => {
    const lang = settings.language;
    const current = settings.location
      ? t(lang, "settings.current", { name: locationName(settings.location, lang) })
      : t(lang, "settings.none");

    const gps = h("button", { type: "button", class: "btn primary" }, t(lang, "settings.gps"));
    gps.addEventListener("click", locateWithGps);

    const zone = locationFromTimeZone(systemTimeZone());
    const zoneButton =
      zone &&
      h("button", { type: "button", class: "btn secondary" }, t(lang, "settings.timeZone", { name: zone.name }));
    zoneButton?.addEventListener("click", () => void chooseLocation(zone!, zone!.countryCode));

    const results = h("ul", { class: "results" });
    const input = h("input", {
      type: "search",
      id: "city-search",
      placeholder: t(lang, "settings.searchPlaceholder"),
      autocomplete: "off",
      value: query,
    });
    const showResults = () => {
      const found = searchCities(query);
      results.replaceChildren(
        ...found.map((city) => {
          const label = lang === "ar" && city.arabic ? `${city.arabic}، ${city.country}` : `${city.name}, ${city.country}`;
          const item = h("button", { type: "button", class: "result" }, label);
          item.addEventListener("click", () => {
            query = "";
            void chooseLocation(cityLocation(city), city.countryCode);
          });
          return h("li", {}, item);
        }),
      );
      if (query.trim().length >= 2 && found.length === 0) {
        results.append(h("li", { class: "muted" }, t(lang, "settings.noResults")));
      }
    };
    input.addEventListener("input", () => {
      query = input.value;
      showResults();
    });
    showResults();

    return h(
      "section",
      { class: "panel settings-section" },
      h("h2", {}, t(lang, "settings.location")),
      h("p", { class: settings.location ? "current" : "current muted" }, current),
      h("div", { class: "actions" }, gps, zoneButton),
      gpsStatus && h("p", { class: gpsStatus.error ? "status error" : "status" }, t(lang, gpsStatus.key, gpsStatus.vars)),
      h("label", { for: "city-search" }, t(lang, "settings.search")),
      input,
      results,
    );
  };

  const remindersSection = (settings: Settings, enabled: boolean): HTMLElement | false => {
    if (!remindersConfigured) return false;
    const lang = settings.language;
    const support = pushSupport();
    const note = (key: I18nKey, error = false) => h("p", { class: error ? "status error" : "status" }, t(lang, key));

    let control: HTMLElement | false = false;
    if (support === "install-first") control = note("reminders.installFirst");
    else if (support === "unavailable") control = note("reminders.unavailable");
    else if (!settings.location && !enabled) control = note("reminders.needLocation");
    else {
      const toggle = h("button", { type: "button", class: enabled ? "btn secondary" : "btn primary" }, t(lang, enabled ? "reminders.disable" : "reminders.enable"));
      toggle.addEventListener("click", async () => {
        toggle.setAttribute("disabled", "");
        reminderStatus = { key: "reminders.working" };
        toggle.textContent = t(lang, "reminders.working");
        try {
          if (enabled) {
            await disableReminders();
            reminderStatus = null;
          } else {
            reminderStatus = (await enableReminders()) ? { key: "reminders.on" } : { key: "reminders.denied", error: true };
          }
        } catch (err) {
          reminderStatus = { key: "reminders.failed", vars: { error: err instanceof Error ? err.message : String(err) }, error: true };
        }
        void render();
      });
      control = h("div", { class: "actions" }, toggle);
    }

    return h(
      "section",
      { class: "panel settings-section" },
      h("h2", {}, t(lang, "reminders.title")),
      h("p", {}, t(lang, "reminders.body")),
      control,
      reminderStatus && h("p", { class: reminderStatus.error ? "status error" : "status" }, t(lang, reminderStatus.key, reminderStatus.vars)),
      h("p", { class: "hint muted" }, t(lang, "reminders.privacy")),
    );
  };

  const select = <T extends string | number>(
    id: string,
    value: T,
    options: [T, string][],
    onPick: (value: T) => void,
  ): HTMLSelectElement => {
    const el = h("select", { id });
    for (const [v, label] of options) el.append(new Option(label, String(v), false, v === value));
    el.addEventListener("change", () => {
      const picked = options.find(([v]) => String(v) === el.value);
      if (picked) onPick(picked[0]);
    });
    return el;
  };

  const field = (id: string, label: string, control: HTMLElement, hint?: string) =>
    h("div", { class: "field" }, h("label", { for: id }, label), control, hint && h("p", { class: "hint muted" }, hint));

  const view = (settings: Settings, remindersOn: boolean): HTMLElement => {
    const lang = settings.language;
    const back = h("a", { href: "#/", class: "back" }, t(lang, "action.back"));

    const method = select(
      "method",
      settings.method,
      METHODS.map((m) => [m.id, m[lang]]),
      (id) => void updateSettings({ method: id }),
    );
    const level = select(
      "level",
      settings.level,
      LEVELS.map((l) => [
        l,
        t(lang, "settings.levelOption", {
          level: t(lang, `level.${l}`),
          morning: estimateMinutes("morning", l),
          evening: estimateMinutes("evening", l),
        }),
      ]),
      (l) => void updateSettings({ level: l }),
    );
    const language = select<Lang>("language", lang, [["en", "English"], ["ar", "العربية"]], (v) => void updateSettings({ language: v }));
    const theme = select<Theme>(
      "theme",
      settings.theme,
      [["system", t(lang, "settings.themeSystem")], ["light", t(lang, "settings.themeLight")], ["dark", t(lang, "settings.themeDark")]],
      (v) => void updateSettings({ theme: v }),
    );
    const textSize = select<TextSize>(
      "text-size",
      settings.textSize,
      [["regular", t(lang, "textSize.regular")], ["medium", t(lang, "textSize.medium")], ["large", t(lang, "textSize.large")]],
      (v) => void updateSettings({ textSize: v }),
    );

    const link = (href: string, label: string) => h("a", { href, target: "_blank", rel: "noopener" }, label);

    return h(
      "div",
      { class: "settings" },
      back,
      h("h1", {}, t(lang, "settings.title")),
      locationSection(settings),
      remindersSection(settings, remindersOn),
      h(
        "section",
        { class: "panel settings-section" },
        field("method", t(lang, "settings.method"), method, t(lang, "settings.methodHint")),
        field("level", t(lang, "settings.level"), level),
      ),
      h(
        "section",
        { class: "panel settings-section" },
        h("h2", {}, t(lang, "settings.appearance")),
        field("language", t(lang, "settings.language"), language),
        field("theme", t(lang, "settings.theme"), theme),
        field("text-size", t(lang, "settings.textSize"), textSize),
      ),
      h(
        "section",
        { class: "panel settings-section about" },
        h("h2", {}, t(lang, "settings.about")),
        h("p", {}, t(lang, "credits.azkar"), " ", link("https://www.hisnmuslim.com", "hisnmuslim.com"), "."),
        h("p", {}, t(lang, "credits.translation")),
        h("p", {}, t(lang, "credits.quran"), " ", link("https://tanzil.net", "tanzil.net"), "."),
        h("p", {}, t(lang, "credits.prayer")),
        h("p", {}, t(lang, "credits.privacy")),
        h("p", {}, t(lang, "credits.source"), " ", link(SOURCE_URL, "GitHub"), "."),
      ),
    );
  };

  // Parse the city list ahead of the first search, without blocking the first paint.
  window.setTimeout(() => allCities(), 0);

  const stop = onChange(["settings", "push"], () => void render());
  void render();
  return stop;
}
