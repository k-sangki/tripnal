import { describe, expect, it } from "vitest";
import { b64url, fromB64url, snapshot, validSubscription, vapidPublicKey } from "./alerts";
import type { DayForecast } from "./weather/types";

describe("alerts", () => {
  it("VAPID 공개키는 0x04 + x + y (65바이트)", () => {
    const x = b64url(new Uint8Array(32).fill(1));
    const y = b64url(new Uint8Array(32).fill(2));
    const k = fromB64url(vapidPublicKey({ x, y }));
    expect(k.length).toBe(65);
    expect([k[0], k[1], k[33]]).toEqual([4, 1, 2]);
  });
  it("기간 안 날짜만 기준값으로 남긴다", () => {
    const day = (date: string) => ({ date, tMax: 20.04, tMin: 8, precipSum: 3.26, windMax: 5.55 }) as DayForecast;
    const s = snapshot([day("2026-10-23"), day("2026-10-24"), day("2026-10-25")], "2026-10-24", "2026-10-25");
    expect(Object.keys(s)).toEqual(["2026-10-24", "2026-10-25"]);
    expect(s["2026-10-24"]).toEqual({ tMax: 20, tMin: 8, precip: 3.3, wind: 5.6 });
  });
  it("푸시 구독 형식 확인", () => {
    expect(validSubscription({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "a", auth: "b" } })).toBe(true);
    expect(validSubscription({ endpoint: "http://x", keys: { p256dh: "a", auth: "b" } })).toBe(false);
    expect(validSubscription({ endpoint: "https://x" })).toBe(false);
  });
});
