import { getBotType } from "next/dist/shared/lib/router/utils/is-bot";

/**
 * Worker 앞단(worker.ts)에서 완성된 응답을 Cloudflare 엣지 캐시에 잠시 보관한다.
 *
 * 무료 플랜은 요청당 CPU 10ms라서, 장소 페이지·미리보기 이미지처럼 그릴 때마다 수십~수백 ms가 드는 응답은
 * 한 번 그린 것을 같은 데이터센터의 다음 방문자(검색 로봇 포함)에게 그대로 돌려준다.
 * 페이지는 주소(검색어 포함)만으로 내용이 정해지므로 주소를 키로 쓴다.
 */

const MIN = 60;
const HOUR = 60 * MIN;

/** 경로별 보관 시간(초). 목록에 없는 경로(검색·알림 등)는 보관하지 않는다 */
export function cacheTtl(pathname: string): number | null {
  if (pathname === "/" || pathname === "/weekend" || pathname === "/weather" || pathname.startsWith("/weather/")) return 15 * MIN;
  // 해외 16일 예보는 예보가 들어 있고, 나머지 해외 페이지는 평년값이라 거의 그대로다
  if (/^\/overseas\/[^/]+\/forecast$/.test(pathname)) return 15 * MIN;
  if (pathname === "/overseas" || pathname.startsWith("/overseas/")) return HOUR;
  if (pathname === "/api/forecast") return 15 * MIN;
  if (pathname === "/api/og") return 3 * HOUR;
  if (pathname === "/api/warnings") return 5 * MIN;
  if (["/sitemap.xml", "/robots.txt", "/manifest.webmanifest", "/ads.txt"].includes(pathname)) return 6 * HOUR;
  if (["/about", "/privacy", "/contact"].includes(pathname)) return 24 * HOUR;
  return null;
}

/** 내용과 상관없는 검색어(광고·유입 추적, 운영자 표시 ?me=)는 키에서 뺀다 */
const IGNORED_PARAMS = /^(utm_.*|fbclid|gclid|gbraid|wbraid|msclkid|yclid|igshid|_ga|me)$/;

/** Next가 응답을 바꾸는 요청 머리 (화면 이동용 RSC 요청) */
const VARY_HEADERS = ["rsc", "next-router-prefetch", "next-router-segment-prefetch", "next-router-state-tree", "next-url"];

/**
 * 캐시 키. 배포마다 바뀌는 deployId를 넣어, 배포 뒤에는 예전 JS 파일을 가리키는 HTML을 쓰지 않는다.
 * 검색 로봇은 Next가 메타 태그를 다르게 넣어 주므로 따로 보관한다.
 */
export async function cacheKey(request: Request, deployId: string): Promise<Request> {
  const url = new URL(request.url);
  const params = [...url.searchParams].filter(([k]) => !IGNORED_PARAMS.test(k)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const q = new URLSearchParams(params);
  const bot = getBotType(request.headers.get("user-agent") ?? "");
  if (bot) q.set("__bot", bot);
  const vary = VARY_HEADERS.map((h) => request.headers.get(h) ?? "").join("\n");
  if (vary.trim()) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(vary));
    q.set("__rsc", [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""));
  }
  return new Request(`https://tripnalc.com/__page/${encodeURIComponent(deployId)}${url.pathname}?${q}`);
}

/** 보관해도 되는 응답인지: 정상(200)이고 쿠키를 심지 않는 것만 */
export function cacheable(res: Response): boolean {
  return res.status === 200 && !res.headers.has("set-cookie");
}

/** 원래 머리는 따로 적어 두고, 엣지 캐시에는 보관 시간만 알려 준다 */
export function toStored(res: Response, ttl: number): Response {
  const headers = new Headers(res.headers);
  headers.set("x-orig-cache-control", res.headers.get("cache-control") ?? "");
  headers.set("x-orig-vary", res.headers.get("vary") ?? "");
  headers.set("cache-control", `public, max-age=${ttl}`);
  // Vary가 있으면 엣지 캐시가 보관하지 않을 수 있다
  headers.delete("vary");
  return new Response(res.body, { status: res.status, headers });
}

/** 꺼낸 응답의 머리를 원래대로 돌려놓는다 (브라우저 캐시 정책은 Next가 정한 그대로) */
export function fromStored(res: Response): Response {
  const headers = new Headers(res.headers);
  const cc = headers.get("x-orig-cache-control");
  const vary = headers.get("x-orig-vary");
  headers.delete("x-orig-cache-control");
  headers.delete("x-orig-vary");
  if (cc) headers.set("cache-control", cc);
  else headers.delete("cache-control");
  if (vary) headers.set("vary", vary);
  headers.delete("age");
  headers.delete("cf-cache-status");
  headers.set("x-edge-cache", "HIT");
  return new Response(res.body, { status: res.status, headers });
}

/** 예전 주소(tripnal.com)와 www는 Next를 거치지 않고 바로 tripnalc.com으로 보낸다 (next.config.ts redirects와 같은 규칙) */
export function canonicalRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  if (!/^(www\.)?tripnal\.com$|^www\.tripnalc\.com$/.test(url.hostname)) return null;
  return Response.redirect(`https://tripnalc.com${url.pathname}${url.search}`, 308);
}

interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}

/** handler 앞에 엣지 캐시를 둔다 */
export async function withEdgeCache(
  request: Request,
  ctx: Ctx,
  deployId: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const redirect = canonicalRedirect(request);
  if (redirect) return redirect;
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const url = new URL(request.url);
  const ttl = request.method === "GET" && url.hostname === "tripnalc.com" ? cacheTtl(url.pathname) : null;
  if (!cache || ttl == null) return handler();

  const key = await cacheKey(request, deployId);
  const hit = await cache.match(key);
  if (hit) return fromStored(hit);

  const res = await handler();
  if (!cacheable(res)) return res;
  const [forClient, forCache] = res.body ? res.body.tee() : [null, null];
  ctx.waitUntil(cache.put(key, toStored(new Response(forCache, res), ttl)));
  const headers = new Headers(res.headers);
  headers.set("x-edge-cache", "MISS");
  return new Response(forClient, { status: res.status, statusText: res.statusText, headers });
}
