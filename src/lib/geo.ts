import { isInKorea } from "@/lib/weather";

export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lon: number;
}

const KAKAO = "https://dapi.kakao.com/v2/local";

/**
 * 카카오 로컬 API 응답은 약관상 저장해서 쓰면 안 되므로 캐시하지 않는다(cache: "no-store").
 */
async function kakao<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new Error("KAKAO_REST_API_KEY missing");
  const res = await fetch(`${KAKAO}${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Kakao ${res.status}`);
  return res.json() as Promise<T>;
}

interface KakaoKeywordDoc {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}
interface KakaoAddressDoc {
  address_name: string;
  x: string;
  y: string;
}
interface KakaoRegionDoc {
  region_type: string;
  address_name: string;
  region_2depth_name: string;
  region_3depth_name: string;
}

async function kakaoSearch(q: string): Promise<PlaceResult[]> {
  const [addr, kw] = await Promise.all([
    kakao<{ documents: KakaoAddressDoc[] }>("/search/address.json", { query: q, size: "5" }).catch(() => ({ documents: [] })),
    kakao<{ documents: KakaoKeywordDoc[] }>("/search/keyword.json", { query: q, size: "10" }),
  ]);
  return [
    ...addr.documents.map((d) => ({ name: d.address_name, address: d.address_name, lat: Number(d.y), lon: Number(d.x) })),
    ...kw.documents.map((d) => ({
      name: d.place_name,
      address: d.road_address_name || d.address_name,
      lat: Number(d.y),
      lon: Number(d.x),
    })),
  ];
}

interface OpenMeteoGeoResult {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  admin2?: string;
  admin3?: string;
}

/** 카카오 키가 없을 때(개발용) 쓰는 대체 검색. 시·군·동 이름 정도만 찾을 수 있다. */
async function openMeteoSearch(q: string): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ name: q, count: "10", language: "ko", countryCode: "KR", format: "json" });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const json = (await res.json()) as { results?: OpenMeteoGeoResult[] };
  return (json.results ?? []).map((r) => ({
    name: r.name,
    address: [r.admin1, r.admin2, r.admin3].filter(Boolean).join(" "),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

export async function searchPlaces(q: string): Promise<PlaceResult[]> {
  const results = process.env.KAKAO_REST_API_KEY ? await kakaoSearch(q) : await openMeteoSearch(q);
  const seen = new Set<string>();
  return results.filter((r) => {
    const k = `${r.name}|${r.lat.toFixed(3)}|${r.lon.toFixed(3)}`;
    if (seen.has(k) || !isInKorea(r.lat, r.lon)) return false;
    seen.add(k);
    return true;
  });
}

interface KakaoAddressResult {
  address: { address_name: string } | null;
  road_address: { address_name: string } | null;
}

/** 좌표 → 주소. 산·바다처럼 번지가 없는 곳은 행정구역 이름으로 대신한다. */
export async function reverseAddress(lat: number, lon: number): Promise<string | null> {
  if (!process.env.KAKAO_REST_API_KEY) throw new Error("KAKAO_REST_API_KEY missing");
  const xy = { x: String(lon), y: String(lat) };
  const json = await kakao<{ documents: KakaoAddressResult[] }>("/geo/coord2address.json", xy);
  const doc = json.documents[0];
  const addr = doc?.road_address?.address_name || doc?.address?.address_name;
  if (addr) return addr;
  const region = await kakao<{ documents: KakaoRegionDoc[] }>("/geo/coord2regioncode.json", xy);
  const r = region.documents.find((d) => d.region_type === "H") ?? region.documents[0];
  return r?.address_name ?? null;
}
