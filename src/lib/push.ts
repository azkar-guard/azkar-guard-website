import { addDays, localDate } from "./dates";
import { prayerDay } from "./prayer";
import { getStatus } from "./session";
import { get, getSettings, set } from "./storage";
import type { Session, Settings } from "./types";

/**
 * Push reminders through the azkar-guard-api Worker. The app computes the next week of
 * windows on the device and uploads only their times; the Worker sends a push at the
 * start of each window and every 30 minutes until the app reports it done.
 */

/** Base URL of the reminders API, set at build time. Reminders are hidden when it is empty. */
const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/** Whether this build has a reminders API at all. */
export const remindersConfigured = Boolean(API_URL);

/** Days of windows uploaded ahead. The app refreshes them whenever it opens. */
const DAYS_AHEAD = 7;

export interface ReminderWindow {
  key: string;
  session: Session;
  start: number;
  end: number;
}

export type PushSupport = "supported" | "unavailable" | "install-first";

/** Whether this browser can get push reminders. iOS only offers push to installed apps. */
export function pushSupport(): PushSupport {
  if (!API_URL || !("serviceWorker" in navigator) || !("Notification" in window)) return "unavailable";
  if (!("PushManager" in window)) {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return ios ? "install-first" : "unavailable";
  }
  return "supported";
}

/** Morning and evening windows from yesterday to DAYS_AHEAD days ahead, ending after `now`. */
export function upcomingWindows(settings: Settings, now: number): ReminderWindow[] {
  if (!settings.location) return [];
  const today = localDate(now);
  const windows: ReminderWindow[] = [];
  for (let n = -1; n <= DAYS_AHEAD; n++) {
    const date = addDays(today, n);
    const day = prayerDay(settings.location, settings.method, date);
    const next = prayerDay(settings.location, settings.method, addDays(date, 1));
    if (!day) continue;
    windows.push({ key: `${date}:morning`, session: "morning", start: day.fajr, end: day.maghrib });
    if (next) windows.push({ key: `${date}:evening`, session: "evening", start: day.maghrib, end: next.fajr });
  }
  return windows.filter((w) => w.end > now);
}

async function api(path: string, method: string, body?: unknown): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}`);
  return response;
}

function decodeKey(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

export async function remindersEnabled(): Promise<boolean> {
  return Boolean(await get("push"));
}

/**
 * Ask for notification permission, subscribe to push and register with the API.
 * Returns false if the user didn't allow notifications.
 */
export async function enableReminders(): Promise<boolean> {
  if ((await Notification.requestPermission()) !== "granted") return false;
  const registration = await navigator.serviceWorker.ready;
  const { key } = (await (await api("/v1/vapid-public-key", "GET")).json()) as { key: string };
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(key) }));

  const settings = await getSettings();
  const response = await api("/v1/subscriptions", "POST", {
    subscription: subscription.toJSON(),
    lang: settings.language,
    windows: upcomingWindows(settings, Date.now()),
  });
  const { id } = (await response.json()) as { id: string };
  await set("push", { id });
  return true;
}

export async function disableReminders(): Promise<void> {
  const push = await get("push");
  await set("push", null);
  if (push) await api(`/v1/subscriptions/${push.id}`, "DELETE").catch(() => undefined);
  const registration = await navigator.serviceWorker.getRegistration();
  await (await registration?.pushManager.getSubscription())?.unsubscribe();
}

/**
 * Re-upload the upcoming windows and language. Called when the app opens and when the
 * location, method or language changes. Failures are left for the next sync.
 */
export async function syncReminders(): Promise<void> {
  const push = await get("push");
  if (!push || pushSupport() !== "supported") return;
  const settings = await getSettings();
  try {
    const response = await api(`/v1/subscriptions/${push.id}`, "PUT", {
      lang: settings.language,
      windows: upcomingWindows(settings, Date.now()),
    });
    // The server dropped the subscription (e.g. the push service expired it): register again.
    if (response.status === 404) await enableReminders();
    // A completion reported while offline never reached the server: report it now.
    const status = await getStatus();
    if (status.state === "active" && status.complete) await reportDone(`${status.window.date}:${status.window.session}`);
  } catch (err) {
    console.warn("Azkar Guard: could not sync reminders", err);
  }
}

/** Tell the API a window is complete, so reminders for it stop. */
export async function reportDone(windowKey: string): Promise<void> {
  const push = await get("push");
  if (!push || pushSupport() !== "supported") return;
  try {
    await api(`/v1/subscriptions/${push.id}/done`, "POST", { key: windowKey });
  } catch (err) {
    console.warn("Azkar Guard: could not report completion", err);
  }
}
