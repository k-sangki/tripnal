/**
 * 저장한 여행(장소·기간)의 예보가 바뀌면 웹 푸시로 알려 주는 기능의 저장 형식.
 * 회원가입 없이 브라우저의 푸시 구독만 R2(alerts/{id}.json)에 둔다.
 * 비교와 발송은 수집이 끝난 뒤 collector/alerts.py가 한다.
 */
import type { DayForecast } from "@/lib/weather/types";

/** 날짜별 비교 기준값 (알림을 보낼 때마다 그 날짜는 새 값으로 바뀐다) */
export interface DaySnap {
  tMax: number | null;
  tMin: number | null;
  /** 하루 강수 합 mm */
  precip: number;
  /** 하루 최대 풍속 m/s */
  wind: number | null;
}

export interface PushSubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface AlertRecord {
  id: string;
  sub: PushSubscriptionJson;
  name: string;
  lat: number;
  lon: number;
  elevation?: number;
  act: string;
  from: string;
  to: string;
  /** 알림을 누르면 열 주소 (사이트 안 경로) */
  path: string;
  created: string;
  base: Record<string, DaySnap>;
}

const r1 = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);

export function snapshot(days: DayForecast[], from: string, to: string): Record<string, DaySnap> {
  const out: Record<string, DaySnap> = {};
  for (const d of days) {
    if (d.date < from || d.date > to) continue;
    out[d.date] = { tMax: r1(d.tMax), tMin: r1(d.tMin), precip: Math.round(d.precipSum * 10) / 10, wind: r1(d.windMax) };
  }
  return out;
}

/** 브라우저가 보낸 구독이 푸시 서비스 주소와 키를 제대로 갖췄는지 */
export function validSubscription(s: unknown): s is PushSubscriptionJson {
  const v = s as PushSubscriptionJson;
  return (
    !!v &&
    typeof v.endpoint === "string" &&
    v.endpoint.startsWith("https://") &&
    v.endpoint.length < 1000 &&
    typeof v.keys?.p256dh === "string" &&
    typeof v.keys?.auth === "string" &&
    v.keys.p256dh.length < 200 &&
    v.keys.auth.length < 100
  );
}

/** "AQAB..." 같은 base64url */
export function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(s: string): Uint8Array {
  const t = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(t, (c) => c.charCodeAt(0));
}

/** VAPID 공개키(브라우저 구독용): 0x04 || x || y 를 base64url로 */
export function vapidPublicKey(jwk: { x: string; y: string }): string {
  const x = fromB64url(jwk.x);
  const y = fromB64url(jwk.y);
  const out = new Uint8Array(65);
  out[0] = 4;
  out.set(x, 1);
  out.set(y, 33);
  return b64url(out);
}
