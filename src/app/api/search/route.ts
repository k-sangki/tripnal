import { searchPlaces } from "@/lib/geo";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return Response.json({ results: [] });
  try {
    const t0 = Date.now();
    const results = await searchPlaces(q.slice(0, 60));
    // 카카오 응답에 걸린 시간 (느릴 때 원인 확인용)
    return Response.json({ results }, { headers: { "Server-Timing": `kakao;dur=${Date.now() - t0}` } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "검색에 실패했습니다." }, { status: 502 });
  }
}
