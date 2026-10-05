import { describe, expect, it } from "vitest";
import { upcomingWindows } from "./push";
import { DEFAULT_SETTINGS } from "./storage";

const cairo = { ...DEFAULT_SETTINGS, location: { latitude: 30.0626, longitude: 31.2497 }, method: 5 };
const now = Date.parse("2026-10-05T10:00:00+03:00");

describe("reminder windows sent to the API", () => {
  const windows = upcomingWindows(cairo, now);

  it("covers about a week of alternating morning and evening windows, in the API's key format", () => {
    expect(windows.length).toBeGreaterThanOrEqual(14);
    for (const w of windows) expect(w.key).toMatch(/^\d{4}-\d{2}-\d{2}:(morning|evening)$/);
    expect(windows[0]?.session).toBe("morning");
    expect(windows[1]?.session).toBe("evening");
  });

  it("only includes windows that haven't ended, starting with the current one", () => {
    expect(windows.every((w) => w.end > now)).toBe(true);
    expect(windows[0]!.start).toBeLessThanOrEqual(now);
  });

  it("chains windows: each one ends where the next begins", () => {
    for (let i = 1; i < windows.length; i++) expect(windows[i]!.start).toBe(windows[i - 1]!.end);
  });

  it("stays within the API's accepted range (up to 15 days ahead, at most 64 windows)", () => {
    expect(windows.length).toBeLessThanOrEqual(64);
    expect(Math.max(...windows.map((w) => w.start))).toBeLessThan(now + 15 * 24 * 3_600_000);
  });

  it("is empty without a location", () => {
    expect(upcomingWindows(DEFAULT_SETTINGS, now)).toEqual([]);
  });
});
