import { getForecast, isInKorea } from "@/lib/weather";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const elevParam = searchParams.get("elev");
  const elevation = elevParam != null && Number.isFinite(Number(elevParam)) ? Number(elevParam) : undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "lat, lon이 필요합니다." }, { status: 400 });
  }
  if (!isInKorea(lat, lon)) {
    return Response.json({ error: "대한민국 안의 위치만 볼 수 있습니다." }, { status: 400 });
  }
  try {
    // 직접 수집 예보로 바꾸기 전에 같은 지점을 비교해 보는 용도
    const provider = searchParams.get("provider") === "collected" ? "collected" : undefined;
    const forecast = await getForecast(lat, lon, elevation, provider);
    return Response.json(forecast, {
      headers: { "Cache-Control": "public, max-age=600, s-maxage=1800" },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "날씨 정보를 가져오지 못했습니다." }, { status: 502 });
  }
}
