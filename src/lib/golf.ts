import { PLACES, type Place } from "@/lib/places";

/** 전국 골프장 날씨(/golf)의 시·도 묶음. 순서가 곧 목록 순서다 */
export const GOLF_REGIONS = [
  { slug: "gyeonggi", short: "경기", name: "경기도" },
  { slug: "gangwon", short: "강원", name: "강원도" },
  { slug: "chungbuk", short: "충북", name: "충청북도" },
  { slug: "chungnam", short: "충남", name: "충청남도" },
  { slug: "jeonbuk", short: "전북", name: "전라북도" },
  { slug: "jeonnam", short: "전남", name: "전라남도" },
  { slug: "gyeongbuk", short: "경북", name: "경상북도" },
  { slug: "gyeongnam", short: "경남", name: "경상남도" },
  { slug: "jeju", short: "제주", name: "제주도" },
  { slug: "seoul", short: "서울", name: "서울" },
  { slug: "incheon", short: "인천", name: "인천" },
  { slug: "busan", short: "부산", name: "부산" },
  { slug: "daegu", short: "대구", name: "대구" },
  { slug: "gwangju", short: "광주", name: "광주" },
  { slug: "daejeon", short: "대전", name: "대전" },
  { slug: "ulsan", short: "울산", name: "울산" },
  { slug: "sejong", short: "세종", name: "세종" },
] as const;

export type GolfRegion = (typeof GOLF_REGIONS)[number];

export const GOLF_COURSES: Place[] = PLACES.filter((p) => p.leisure === "golf");

/** 장소 region("경기 용인시")의 앞 글자로 시·도를 찾는다 */
export function golfRegionOf(p: Pick<Place, "region">): GolfRegion | undefined {
  return GOLF_REGIONS.find((r) => p.region.startsWith(r.short));
}

export function getGolfRegion(slug: string): GolfRegion | undefined {
  return GOLF_REGIONS.find((r) => r.slug === slug);
}

export function coursesIn(region: GolfRegion): Place[] {
  return GOLF_COURSES.filter((p) => golfRegionOf(p) === region).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/** 골프장이 한 곳이라도 있는 시·도 */
export function activeGolfRegions(): GolfRegion[] {
  return GOLF_REGIONS.filter((r) => coursesIn(r).length);
}

/** 골프장들의 가운데 지점 (시·도 페이지 날씨 요약에 쓴다) */
export function centerOf(list: Pick<Place, "lat" | "lon">[]): { lat: number; lon: number } {
  return {
    lat: list.reduce((a, p) => a + p.lat, 0) / list.length,
    lon: list.reduce((a, p) => a + p.lon, 0) / list.length,
  };
}
