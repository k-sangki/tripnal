/**
 * 외부 API 응답을 Cloudflare 엣지 캐시(Workers Cache API)에 잠시 보관한다.
 * 같은 좌표의 예보를 여러 사람이 볼 때 외부 API 호출을 한 번으로 줄인다.
 * Cache API가 없는 환경(로컬 next dev 등)에서는 그냥 요청한다.
 */
interface EdgeCacheStorage {
  default?: Cache;
}

function edgeCache(): Cache | null {
  const c = (globalThis as { caches?: EdgeCacheStorage }).caches;
  return c?.default ?? null;
}

export async function fetchJsonCached<T>(url: string, ttlSeconds: number, init?: RequestInit): Promise<T> {
  const cache = edgeCache();
  // 키는 우리 도메인 아래의 가상 주소로 만들고, 비밀값(apikey)은 빼고 쓴다
  const clean = url.replace(/([?&])apikey=[^&]*&?/, "$1");
  const key = new Request(`https://tripnalc.com/__cache/${encodeURIComponent(clean)}`);
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return (await hit.json()) as T;
  }
  const res = await fetch(url, { ...init, cache: "no-store" });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  const body = await res.text();
  if (cache) {
    await cache.put(
      key,
      new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttlSeconds}` } }),
    );
  }
  return JSON.parse(body) as T;
}
