import { bucket, shortKey, validId, validTarget } from "@/lib/shortLink";

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
  return new Response(null, {
    status: 302,
    headers: { Location: `https://tripnalc.com${target}`, "Cache-Control": target === "/" ? "no-store" : "public, max-age=86400", "X-Robots-Tag": "noindex" },
  });
}
