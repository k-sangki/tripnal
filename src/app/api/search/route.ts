import { searchPlaces } from "@/lib/geo";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return Response.json({ results: [] });
  try {
    return Response.json({ results: await searchPlaces(q.slice(0, 60)) });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "검색에 실패했습니다." }, { status: 502 });
  }
}
