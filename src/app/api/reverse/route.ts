import { reverseName } from "@/lib/geo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "lat, lon이 필요합니다." }, { status: 400 });
  }
  try {
    return Response.json({ name: await reverseName(lat, lon) });
  } catch (e) {
    console.error(e);
    return Response.json({ name: null });
  }
}
