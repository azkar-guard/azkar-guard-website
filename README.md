# Azkar Guard: web app (PWA)

Phase 3 of Azkar Guard. An installable web app that brings the morning and evening Azkar checklist to phones, with no app store: open the site, install it to the home screen, and it opens and works like an app, including offline.

- **Morning window:** Fajr → Maghrib.
- **Evening window:** Maghrib → next Fajr.

Prayer times are calculated **on the device** with [adhan-js](https://github.com/batoulapps/adhan-js), the same code as the VS Code extension.

## What's in this version

- **Checklist:** the same tap-to-count checklist as the browser extension, with the Small, Medium and Full levels, the completed group, the streak and the completion celebration.
- **Location:** pick it once in settings:
  - **Use my current location:** the browser's location service. The coordinates stay on the device.
  - **Use my time zone:** a guess from the device's time zone, e.g. "Cairo, Egypt".
  - **Search:** 6,000+ bundled cities, in English or Arabic.

  The calculation method is then picked from the country (e.g. Egyptian General Authority for Egypt) and can be changed.
- **Install card:** Chrome's install prompt on Android and desktop; Share → Add to Home Screen instructions on iPhone and iPad.
- **Offline:** a service worker precaches every built file, so after the first visit the app opens without a connection.
- **Arabic and English**, light and dark themes, three text sizes.

**Not yet:** push reminders. Browsers can't schedule a notification on their own, so reminders need the Go API ([azkar-guard-api](https://github.com/azkar-guard/azkar-guard-api)) to send web push. That is the next step.

All state is in `localStorage` on the device. There is no account, backend or analytics in this version.

## Local setup

Requirements: Node 22.12+ (`.nvmrc` pins 24 LTS).

```bash
npm install
npm run dev        # http://localhost:5173, no service worker
npm run build      # typecheck + production build in dist/
npm run preview    # serve dist/ on http://localhost:4173, with the service worker
```

| Command | What it does |
|---|---|
| `npm run build` | Typecheck, build the app and `sw.js`, copy LICENSE, CREDITS.md and PRIVACY.md into `dist/` |
| `npm test` | Unit tests (azkar data, windows, streak, prayer times against AlAdhan, locations) |
| `npm run typecheck` | `tsc --noEmit` |

To try it on a phone during development, the page must be served over HTTPS (or `localhost`) for the service worker and install prompt to work.

## How it's built

- **No framework.** TypeScript and Vite, with the same small `h()` DOM helper as the extensions.
- **Shared logic is copied, not shared**, per the project plan: `src/lib` and `src/data` come from the browser extension (azkar, windows, streak, checklist UI) and the VS Code extension (offline prayer times, cities, time zones). Keep fixes in sync by hand.
- **Service worker:** `vite.config.ts` generates `sw.js` at build time with the exact list of built files. The cache name is a hash of that list, so every deploy replaces the old cache.
- **Routing:** two views, `#/` (checklist) and `#/settings`, so the static files can be hosted anywhere.

## Project layout

```
index.html                 app shell
public/                    manifest.webmanifest, icons (from the brand kit)
src/main.ts                router, toolbar, install card, service worker registration
src/lib/                   types, storage (localStorage), prayer times, locations, methods, session state
src/ui/                    checklist, settings page, install card, styles
src/data/                  azkar.json, cities.json, countries.json, timezones.json
vite.config.ts             build + service worker generation
```

## License, credits and privacy

- **Code:** MIT, see [LICENSE](LICENSE).
- **Content:** see [CREDITS.md](CREDITS.md). Hisn al-Muslim allows free distribution only, so the app must stay free.
- **Privacy:** see [PRIVACY.md](PRIVACY.md). Nothing you enter or do in the app leaves the device.
