import { snapshot, validSubscription, vapidPublicKey, type AlertRecord } from "@/lib/alerts";
import { getLeisure } from "@/lib/leisure";
import { clampPeriod } from "@/lib/period";
import { kstDate } from "@/lib/time";
import { getForecast, isInKorea } from "@/lib/weather";

/**
 * 날씨 변화 알림 구독.
 * GET: 브라우저 구독에 쓸 VAPID 공개키 / POST: 장소·기간 알림 저장 / DELETE ?id=: 알림 끄기
 */

interface Bucket {
  get(key: string): Promise<{ json<T>(): Promise<T> } | null>;
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
}

/** 비공개 키는 버킷 안에만 두고(발송은 collector/alerts.py), 화면에는 공개키만 준다 */
const KEY_PATH = "alerts-keys/vapid.json";

async function bucket(): Promise<Bucket> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const env = (await getCloudflareContext({ async: true })).env as unknown as { DATA?: Bucket };
  if (!env.DATA) throw new Error("R2 바인딩(DATA)이 없음");
  return env.DATA;
}

type Jwk = { kty: string; crv: string; x: string; y: string; d: string };
let keyMemo: Promise<Jwk> | null = null;

/** 처음 한 번 P-256 키를 만들어 버킷에 둔다 */
function vapidKey(b: Bucket): Promise<Jwk> {
  keyMemo ??= (async () => {
    const o = await b.get(KEY_PATH);
    if (o) return o.json<Jwk>();
    const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const jwk = (await crypto.subtle.exportKey("jwk", pair.privateKey)) as Jwk;
    const key = { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d };
    await b.put(KEY_PATH, JSON.stringify(key), { httpMetadata: { contentType: "application/json" } });
    return key;
  })().catch((e) => {
    keyMemo = null;
    throw e;
  });
  return keyMemo;
}

export async function GET() {
  try {
    const key = await vapidKey(await bucket());
    return Response.json({ publicKey: vapidPublicKey(key) }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "알림을 준비하지 못했습니다." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 4000) return Response.json({ error: "요청이 너무 깁니다." }, { status: 413 });
  let body: {
    subscription?: unknown;
    place?: { name?: string; lat?: number; lon?: number; elevation?: number; slug?: string };
    act?: string;
    from?: string;
    to?: string;
  };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "형식이 맞지 않습니다." }, { status: 400 });
  }
  const p = body.place;
  const lat = Number(p?.lat);
  const lon = Number(p?.lon);
  if (!validSubscription(body.subscription) || !p || !Number.isFinite(lat) || !Number.isFinite(lon) || !isInKorea(lat, lon)) {
    return Response.json({ error: "알림 정보가 올바르지 않습니다." }, { status: 400 });
  }
  const period = clampPeriod(body.from, body.to, kstDate());
  const elevation = Number.isFinite(Number(p.elevation)) && p.elevation != null ? Number(p.elevation) : undefined;
  const act = getLeisure(body.act).id;
  const name = String(p.name ?? "").slice(0, 40) || "선택한 위치";
  const q = new URLSearchParams(
    p.slug ? { act, from: period.from, to: period.to } : { lat: lat.toFixed(4), lon: lon.toFixed(4), name, act, from: period.from, to: period.to },
  );
  const path = `${p.slug && /^[a-z0-9-]+$/.test(p.slug) ? `/weather/${p.slug}` : "/"}?${q}`;

  try {
    const forecast = await getForecast(lat, lon, elevation);
    const record: AlertRecord = {
      id: crypto.randomUUID(),
      sub: body.subscription,
      name,
      lat,
      lon,
      ...(elevation != null ? { elevation } : {}),
      act,
      from: period.from,
      to: period.to,
      path,
      created: new Date().toISOString(),
      base: snapshot(forecast.days, period.from, period.to),
    };
    await (await bucket()).put(`alerts/${record.id}.json`, JSON.stringify(record), { httpMetadata: { contentType: "application/json" } });
    return Response.json({ id: record.id });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "알림을 저장하지 못했습니다." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "id가 올바르지 않습니다." }, { status: 400 });
  try {
    await (await bucket()).delete(`alerts/${id}.json`);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "알림을 끄지 못했습니다." }, { status: 502 });
  }
}
