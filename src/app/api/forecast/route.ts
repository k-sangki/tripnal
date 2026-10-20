import { destinationOffset, findDestination } from "@/lib/overseas";
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
  // 해외는 미리 받아 두는 여행지 목록의 좌표만 (현지 시간으로)
  // (후쿠오카처럼 한국 격자 안에 드는 여행지도 해외 여행지로)
  const dest = findDestination(lat, lon);
  if (!isInKorea(lat, lon) && !dest) {
    return Response.json({ error: "대한민국 안의 위치나 해외 날씨 목록의 여행지만 볼 수 있습니다." }, { status: 400 });
  }
  try {
    // 직접 수집 예보로 바꾸기 전에 같은 지점을 비교해 보는 용도
    const provider = searchParams.get("provider") === "collected" ? "collected" : undefined;
    const forecast = dest
      ? await getForecast(dest.lat, dest.lon, dest.elevation, provider, destinationOffset(dest))
      : await getForecast(lat, lon, elevation, provider);
    return Response.json(forecast, {
      headers: { "Cache-Control": "public, max-age=600, s-maxage=1800" },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "날씨 정보를 가져오지 못했습니다." }, { status: 502 });
  }
}
