import { bucket, shortId, shortKey, validTarget } from "@/lib/shortLink";

/** POST { u: "/?lat=..." } → { url: "https://tripnalc.com/s/xxxxxxxx" } */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 1000) return Response.json({ error: "요청이 너무 깁니다." }, { status: 413 });
  let u: unknown;
  try {
    u = (JSON.parse(text) as { u?: unknown }).u;
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!validTarget(u)) return Response.json({ error: "잘못된 주소입니다." }, { status: 400 });
  try {
    const id = await shortId(u);
    const b = await bucket();
    if (!(await b.get(shortKey(id)))) {
      await b.put(shortKey(id), JSON.stringify({ u }), { httpMetadata: { contentType: "application/json" } });
    }
    return Response.json({ url: `https://tripnalc.com/s/${id}` });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "짧은 주소를 만들지 못했습니다." }, { status: 503 });
  }
}
