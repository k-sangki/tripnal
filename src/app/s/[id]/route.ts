import { bucket, shortKey, validId, validTarget } from "@/lib/shortLink";
import { withUtm } from "@/lib/utm";

/** 짧은 주소 → 원래 화면으로 이동. 없는 주소는 첫 화면으로 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let target = "/";
  if (validId(id)) {
    try {
      const o = await (await bucket()).get(shortKey(id));
      const u = o ? (await o.json<{ u?: unknown }>()).u : null;
      if (validTarget(u)) target = u;
    } catch (e) {
      console.error(e);
    }
  }
  // 짧은 주소로 들어온 방문을 GA4에서 "공유 유입"으로 볼 수 있게 표시한다 (엣지 캐시는 utm_*을 무시)
  const location = target === "/" ? "https://tripnalc.com/" : withUtm(`https://tripnalc.com${target}`, "share", "shortlink");
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": target === "/" ? "no-store" : "public, max-age=86400", "X-Robots-Tag": "noindex" },
  });
}
