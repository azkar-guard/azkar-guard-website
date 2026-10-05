import { describe, expect, it } from "vitest";
import { allCities, cityLocation, cityNames, findCity, locationFromTimeZone, nearestCity, searchCities } from "./locations";

describe("offline locations", () => {
  it("has the major cities with Arabic names and aliases", () => {
    const makkah = allCities().find((c) => c.name === "Makkah");
    expect(makkah).toMatchObject({ arabic: "مكة المكرمة", country: "Saudi Arabia" });
    expect(cityNames(makkah!)).toContain("Mecca");
    expect(allCities().length).toBeGreaterThan(5000);
  });

  it("detects a location from the system time zone, including old zone names", () => {
    expect(locationFromTimeZone("Africa/Cairo")).toMatchObject({ name: "Cairo, Egypt", countryCode: "EG", latitude: 30.05, longitude: 31.25 });
    expect(locationFromTimeZone("Asia/Calcutta")?.name).toBe("Kolkata, India");
    expect(locationFromTimeZone("Nowhere/Invalid")).toBeUndefined();
    expect(locationFromTimeZone(undefined)).toBeUndefined();
  });

  it("resolves old free-text city settings, in English, Arabic or by alias", () => {
    expect(findCity("Cairo", "Egypt")?.name).toBe("Cairo");
    expect(findCity("cairo", "EG")?.name).toBe("Cairo");
    expect(findCity("القاهرة", "")?.name).toBe("Cairo");
    expect(findCity("Mecca", "Saudi Arabia")?.name).toBe("Makkah");
    expect(findCity("Alexandria", "United States")?.countryCode).toBe("US");
    expect(findCity("Atlantis", "Egypt")).toBeUndefined();
  });

  it("builds a display name for a city", () => {
    expect(cityLocation(findCity("Cairo", "Egypt")!)).toEqual({ latitude: 30.0626, longitude: 31.2497, name: "Cairo, Egypt" });
  });

  it("searches cities by prefix in English, Arabic or alias", () => {
    expect(searchCities("cai")[0]?.name).toBe("Cairo");
    expect(searchCities("القاه")[0]?.name).toBe("Cairo");
    expect(searchCities("mecca")[0]?.name).toBe("Makkah");
    expect(searchCities("c")).toEqual([]);
  });

  it("finds the nearest city to coordinates", () => {
    expect(nearestCity(30.04, 31.23)?.name).toBe("Cairo");
    expect(nearestCity(21.42, 39.83)?.name).toBe("Makkah");
  });
});
