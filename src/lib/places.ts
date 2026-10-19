import type { LeisureId } from "@/lib/leisure";

export interface Place {
  /** URL용 영문 slug: /weather/{slug} */
  slug: string;
  name: string;
  /** 시·도 + 시·군·구 */
  region: string;
  lat: number;
  lon: number;
  /** 산 정상처럼 기온 보정에 쓸 고도(m). 없으면 지형 자료 값을 쓴다. */
  elevation?: number;
  leisure: LeisureId;
  /** 검색어 확장용 별칭 */
  aliases?: string[];
}

/**
 * 1차 시드 장소. 좌표는 대표 지점 기준의 근사값이며,
 * 이후 공공데이터(고캠핑, 산림청 명산, 해수욕장·낚시터)로 대량 확장한다.
 */
export const PLACES: Place[] = [
  // 캠핑
  { slug: "jarasum-autocamp", name: "자라섬 오토캠핑장", region: "경기 가평군", lat: 37.818, lon: 127.522, leisure: "camping", aliases: ["자라섬 캠핑장"] },
  { slug: "nanji-camping", name: "난지캠핑장", region: "서울 마포구", lat: 37.5676, lon: 126.8737, leisure: "camping", aliases: ["난지 한강공원 캠핑장"] },
  { slug: "mongsanpo-autocamp", name: "몽산포 오토캠핑장", region: "충남 태안군", lat: 36.668, lon: 126.282, leisure: "camping", aliases: ["몽산포 해수욕장 캠핑"] },

  // 바다·낚시
  { slug: "taean", name: "태안", region: "충남 태안군", lat: 36.745, lon: 126.298, leisure: "fishing", aliases: ["태안 바다낚시"] },
  { slug: "anmyeondo", name: "안면도", region: "충남 태안군", lat: 36.53, lon: 126.35, leisure: "fishing" },
  { slug: "oido", name: "오이도", region: "경기 시흥시", lat: 37.345, lon: 126.688, leisure: "fishing" },
  { slug: "jumunjin-port", name: "주문진항", region: "강원 강릉시", lat: 37.892, lon: 128.83, leisure: "fishing" },
  { slug: "sokcho", name: "속초", region: "강원 속초시", lat: 38.207, lon: 128.592, leisure: "fishing" },
  { slug: "yeosu", name: "여수", region: "전남 여수시", lat: 34.76, lon: 127.662, leisure: "fishing" },
  { slug: "tongyeong", name: "통영", region: "경남 통영시", lat: 34.854, lon: 128.433, leisure: "fishing" },
  { slug: "seogwipo", name: "서귀포", region: "제주 서귀포시", lat: 33.254, lon: 126.56, leisure: "fishing" },

  // 해변·여행
  { slug: "eurwangni-beach", name: "을왕리해수욕장", region: "인천 중구", lat: 37.447, lon: 126.373, leisure: "travel" },
  { slug: "daecheon-beach", name: "대천해수욕장", region: "충남 보령시", lat: 36.305, lon: 126.515, leisure: "travel" },
  { slug: "haeundae-beach", name: "해운대해수욕장", region: "부산 해운대구", lat: 35.1587, lon: 129.1604, leisure: "travel" },
  { slug: "gyeongpo-beach", name: "경포해변", region: "강원 강릉시", lat: 37.805, lon: 128.908, leisure: "travel" },
  { slug: "seoul", name: "서울", region: "서울특별시", lat: 37.5665, lon: 126.978, leisure: "travel" },
  { slug: "busan", name: "부산", region: "부산광역시", lat: 35.18, lon: 129.075, leisure: "travel" },
  { slug: "gangneung", name: "강릉", region: "강원 강릉시", lat: 37.752, lon: 128.876, leisure: "travel" },
  { slug: "gyeongju", name: "경주", region: "경북 경주시", lat: 35.856, lon: 129.225, leisure: "travel" },
  { slug: "jeonju-hanok-village", name: "전주 한옥마을", region: "전북 전주시", lat: 35.815, lon: 127.153, leisure: "travel" },
  { slug: "jeju", name: "제주", region: "제주 제주시", lat: 33.499, lon: 126.531, leisure: "travel" },

  // 산 (정상 고도로 기온 보정)
  { slug: "seoraksan-daecheongbong", name: "설악산 대청봉", region: "강원 속초시·인제군·양양군", lat: 38.1192, lon: 128.4655, elevation: 1708, leisure: "hiking", aliases: ["설악산"] },
  { slug: "jirisan-cheonwangbong", name: "지리산 천왕봉", region: "경남 산청군", lat: 35.3369, lon: 127.7306, elevation: 1915, leisure: "hiking", aliases: ["지리산"] },
  { slug: "hallasan", name: "한라산 백록담", region: "제주 서귀포시", lat: 33.3617, lon: 126.5292, elevation: 1947, leisure: "hiking", aliases: ["한라산"] },
  { slug: "bukhansan-baegundae", name: "북한산 백운대", region: "서울 강북구·경기 고양시", lat: 37.6588, lon: 126.9779, elevation: 836, leisure: "hiking", aliases: ["북한산"] },
  { slug: "deogyusan-hyangjeokbong", name: "덕유산 향적봉", region: "전북 무주군", lat: 35.8604, lon: 127.7464, elevation: 1614, leisure: "hiking", aliases: ["덕유산"] },
  { slug: "odaesan-birobong", name: "오대산 비로봉", region: "강원 평창군", lat: 37.7948, lon: 128.5434, elevation: 1563, leisure: "hiking", aliases: ["오대산"] },
  { slug: "taebaeksan", name: "태백산 장군봉", region: "강원 태백시", lat: 37.0975, lon: 128.9156, elevation: 1567, leisure: "hiking", aliases: ["태백산"] },
  { slug: "sobaeksan-birobong", name: "소백산 비로봉", region: "충북 단양군·경북 영주시", lat: 36.9575, lon: 128.4846, elevation: 1439, leisure: "hiking", aliases: ["소백산"] },
  { slug: "gwanaksan", name: "관악산 연주대", region: "서울 관악구·경기 과천시", lat: 37.4446, lon: 126.964, elevation: 629, leisure: "hiking", aliases: ["관악산"] },
  { slug: "dobongsan-jaunbong", name: "도봉산 자운봉", region: "서울 도봉구·경기 의정부시", lat: 37.699, lon: 127.0153, elevation: 740, leisure: "hiking", aliases: ["도봉산"] },
  { slug: "mudeungsan", name: "무등산 천왕봉", region: "광주 북구·전남 화순군", lat: 35.1342, lon: 126.9888, elevation: 1187, leisure: "hiking", aliases: ["무등산"] },
  { slug: "chiaksan-birobong", name: "치악산 비로봉", region: "강원 원주시", lat: 37.3653, lon: 128.0563, elevation: 1288, leisure: "hiking", aliases: ["치악산"] },

  // 자전거
  { slug: "hangang-bike-yeouido", name: "한강 자전거길 여의도", region: "서울 영등포구", lat: 37.528, lon: 126.933, leisure: "cycling", aliases: ["한강 라이딩"] },
  { slug: "namhangang-bike-yangpyeong", name: "남한강 자전거길 양평", region: "경기 양평군", lat: 37.49, lon: 127.49, leisure: "cycling", aliases: ["양평 라이딩"] },
];

export function getPlace(slug: string): Place | undefined {
  return PLACES.find((p) => p.slug === slug);
}
