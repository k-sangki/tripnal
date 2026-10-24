import { describe, expect, it } from "vitest";
import { cacheKey, cacheTtl, canonicalRedirect, fromStored, toStored, withEdgeCache } from "./edgePageCache";

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

describe("엣지 캐시", () => {
  it("무거운 페이지·이미지만 보관하고 검색·알림은 보관하지 않는다", () => {
    expect(cacheTtl("/weather/seoul")).toBe(900);
    expect(cacheTtl("/overseas/osaka")).toBe(3600);
    expect(cacheTtl("/overseas/osaka/forecast")).toBe(900);
    expect(cacheTtl("/api/og")).toBe(3 * 3600);
    expect(cacheTtl("/api/search")).toBeNull();
    expect(cacheTtl("/api/alerts")).toBeNull();
    expect(cacheTtl("/_next/static/x.js")).toBeNull();
  });

  it("키: 추적용 검색어는 빼고 순서를 맞추며, 배포·로봇·RSC 요청은 따로", async () => {
    const k = async (url: string, headers: Record<string, string> = {}, deploy = "d1") =>
      (await cacheKey(new Request(url, { headers: { "user-agent": CHROME, ...headers } }), deploy)).url;
    const base = await k("https://tripnalc.com/?lat=37&lon=127");
    expect(await k("https://tripnalc.com/?lon=127&utm_source=naver&lat=37&me=1")).toBe(base);
    expect(await k("https://tripnalc.com/?lat=37&lon=127", {}, "d2")).not.toBe(base);
    expect(await k("https://tripnalc.com/?lat=37&lon=127", { "user-agent": "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)" })).toContain("__bot=html");
    expect(await k("https://tripnalc.com/?lat=37&lon=127", { rsc: "1" })).toContain("__rsc=");
  });

  it("보관할 때 바꾼 머리는 꺼낼 때 원래대로", async () => {
    const res = new Response("x", { headers: { "cache-control": "private, no-store", vary: "rsc", "content-type": "text/html" } });
    const stored = toStored(res, 900);
    expect(stored.headers.get("cache-control")).toBe("public, max-age=900");
    expect(stored.headers.has("vary")).toBe(false);
    const back = fromStored(stored);
    expect(back.headers.get("cache-control")).toBe("private, no-store");
    expect(back.headers.get("vary")).toBe("rsc");
    expect(back.headers.get("x-edge-cache")).toBe("HIT");
    expect(await back.text()).toBe("x");
  });

  it("예전 주소는 바로 이동", () => {
    expect(canonicalRedirect(new Request("https://tripnal.com/weather/seoul?x=1"))!.headers.get("location")).toBe("https://tripnalc.com/weather/seoul?x=1");
    expect(canonicalRedirect(new Request("https://www.tripnalc.com/"))!.status).toBe(308);
    expect(canonicalRedirect(new Request("https://tripnalc.com/"))).toBeNull();
  });

  it("두 번째 요청은 그리지 않고 보관한 것을 준다 (200만)", async () => {
    const store = new Map<string, Response>();
    const cache = {
      async match(k: Request) {
        return store.get(k.url)?.clone();
      },
      async put(k: Request, r: Response) {
        store.set(k.url, new Response(await r.text(), r));
      },
    };
    (globalThis as { caches?: unknown }).caches = { default: cache };
    const pending: Promise<unknown>[] = [];
    const ctx = { waitUntil: (p: Promise<unknown>) => void pending.push(p) };
    let calls = 0;
    const handler = async () => (calls++, new Response(`page ${calls}`, { headers: { "cache-control": "private, no-store" } }));
    const req = () => new Request("https://tripnalc.com/weather/seoul", { headers: { "user-agent": CHROME } });
    try {
      const a = await withEdgeCache(req(), ctx, "d1", handler);
      expect(await a.text()).toBe("page 1");
      await Promise.all(pending);
      const b = await withEdgeCache(req(), ctx, "d1", handler);
      expect(await b.text()).toBe("page 1");
      expect(b.headers.get("cache-control")).toBe("private, no-store");
      expect(calls).toBe(1);
      // 실패한 응답은 보관하지 않는다
      await withEdgeCache(new Request("https://tripnalc.com/api/og?slug=x"), ctx, "d1", async () => new Response("err", { status: 500 }));
      await Promise.all(pending);
      expect([...store.keys()].some((k) => k.includes("/api/og"))).toBe(false);
    } finally {
      delete (globalThis as { caches?: unknown }).caches;
    }
  });
});
