# Azkar Guard web app: privacy policy

*Last updated: 2026-10-04*

Azkar Guard is a web app you can install on your phone or computer. It reminds you to complete your morning and evening Azkar. It has no accounts, no analytics, no ads and no cookies.

## What is stored, and where

Your **settings** (location as coordinates and a display name, calculation method, level, language, theme, text size), your **progress** in the current session and your **completion history** (for the streak) are kept in your browser's local storage on this device. Clearing the site's data in your browser removes them.

## What leaves your device

**Nothing you enter or do in the app, unless you turn on reminders** (below). Prayer times are calculated on your device with [adhan-js](https://github.com/batoulapps/adhan-js). Your location comes from a city list bundled with the app, your device's time zone, or, only when you press "Use my current location", your browser's location service. The coordinates are used on the device and never sent anywhere.

The app's files are downloaded from the server that hosts it, like any website. That server may keep standard access logs (such as IP address and time of the request). The app sends it nothing else.

## Reminders (optional)

Reminders are off until you turn them on in settings. Browsers can't schedule notifications on their own, so when you turn them on, the app registers with the Azkar Guard reminder server and sends it:

- your browser's push subscription (the push service address and the keys to encrypt messages to it),
- your interface language,
- the start and end times of your next week of morning and evening windows,
- and, as you finish them, which windows you completed.

**Your location is never sent**, only the times computed from it. Turning reminders off deletes this record. Details: the reminder server's [privacy policy](https://github.com/azkar-guard/azkar-guard-api/blob/main/PRIVACY.md).

## Contact

Open an issue in the project's GitHub repository.
