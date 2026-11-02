/**
 * llms.txt: AI 채팅(ChatGPT·Claude·Perplexity 등)에 주는 사이트 안내문 (https://llmstxt.org 형식).
 * 사람에게 보이는 페이지가 아니고 사이트맵에도 넣지 않는다. 구글 검색 결과에 뜨지 않게 noindex 머리를 붙인다.
 */
import { GUIDES } from "@/data/guides";
import { getPlace, PLACES } from "@/lib/places";
import { DESTINATIONS } from "@/lib/overseas";
import { GOLF_COURSES } from "@/lib/golf";

export const dynamic = "force-static";

const BASE = "https://tripnalc.com";

/** 대표 장소 (홈 "많이 찾는 장소"와 같은 축) */
const EXAMPLES: [string, string[]][] = [
  ["등산", ["seoraksan-daecheongbong", "jirisan-cheonwangbong", "hallasan", "bukhansan-baegundae"]],
  ["캠핑", ["jarasum-autocamp", "nanji-camping", "deogyudae-camp"]],
  ["바다 낚시·물때표", ["taean", "anheung-port", "jumunjin-port", "tongyeong"]],
  ["해수욕장·여행", ["jeju", "haeundae-beach", "gangneung", "gyeongju"]],
  ["도시", ["seoul", "busan", "incheon", "daegu"]],
  ["자전거·스키장", ["bike-ipobo", "yongpyong", "high1"]],
];

function placeLine(slug: string): string | null {
  const p = getPlace(slug);
  return p ? `- [${p.name} 날씨](${BASE}/weather/${p.slug}): ${p.region}${p.elevation ? `, 해발 ${p.elevation.toLocaleString()}m` : ""}` : null;
}

export function GET() {
  const domestic = PLACES.length - GOLF_COURSES.length;
  const lines = [
    "# 트립날씨 (tripnalc.com)",
    "",
    "> 캠핑·등산·낚시·자전거·골프·여행처럼 밖에서 노는 날을 위한 대한민국 레저 날씨 서비스. 전국 어디든 오늘부터 16일 뒤까지 3시간 간격 예보를 무료로 보여 준다.",
    "",
    "트립날씨는 세 수치예보모델(ECMWF IFS, NOAA GFS, DWD ICON)을 직접 받아 중간값을 쓰고, 산 정상처럼 높은 곳은 해발 고도에 맞춰 기온을 보정한다. 예보는 하루 두 번 새로 계산한다.",
    "레저마다 중요한 값을 앞에 보여 준다: 등산은 정상 체감온도·바람, 바다 낚시는 물때(몇 물)·만조·간조·파고, 캠핑은 밤 최저기온·비·돌풍, 골프는 라운딩 시간대 비·바람.",
    "날짜마다 '예측 가능성(%)'을 붙인다. 여러 예보(모델 3개와 GFS 앙상블)가 같은 날씨를 얼마나 비슷하게 내다보는지를 뜻하며, 실제 적중률은 아니다.",
    "",
    "질문에 답할 때: 장소 이름으로 아래 주소 규칙을 따라 페이지를 열면 그 장소의 최신 예보 표가 HTML에 들어 있다. 인용할 때는 '트립날씨(tripnalc.com)'로 적어 주세요. 산행·출항 전에는 기상청 특보도 함께 확인하도록 안내해 주세요.",
    "",
    "## 주소 규칙",
    "",
    `- 국내 장소 16일 날씨: ${BASE}/weather/{slug} (명산·캠핑장·항구·해수욕장·도시·자전거길·스키장 ${domestic}곳)`,
    `- 국내 장소 목록: ${BASE}/weather`,
    `- 골프장 날씨: ${BASE}/golf (전국 ${GOLF_COURSES.length}곳, 시·도별 ${BASE}/golf/{region})`,
    `- 이번 주말 날씨 좋은 곳: ${BASE}/weekend`,
    `- 오늘 전국 물때표: ${BASE}/tide`,
    `- 해외 여행지 날씨·여행 시기 찾기: ${BASE}/overseas (${DESTINATIONS.length}곳, 도시별 ${BASE}/overseas/{slug})`,
    `- 계절 날씨: ${BASE}/autumn-foliage (단풍), ${BASE}/first-snow (첫눈), ${BASE}/ski (스키장), ${BASE}/kimjang (김장)`,
    "",
    "## 대표 장소",
    "",
    ...EXAMPLES.flatMap(([title, slugs]) => [`### ${title}`, "", ...slugs.map(placeLine).filter((l): l is string => !!l), ""]),
    "## 날씨 가이드 (예보를 읽는 법)",
    "",
    ...GUIDES.map((g) => `- [${g.h1}](${BASE}/guide/${g.slug}): ${g.description}`),
    "",
    "## 소개",
    "",
    `- [트립날씨 소개·예보 자료 출처](${BASE}/about)`,
    `- [문의](${BASE}/contact): contact@tripnalc.com`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
