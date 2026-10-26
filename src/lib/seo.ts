import { getLeisure } from "@/lib/leisure";
import { presetPeriod, inPeriod } from "@/lib/period";
import type { Place } from "@/lib/places";
import { kstDate, shortDateKo } from "@/lib/time";
import { codeInfo } from "@/lib/weather/codes";
import type { Forecast } from "@/lib/weather/types";

/** 받침 유무에 따라 "은/는" */
export function topic(word: string): string {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return `${word}은(는)`;
  return (c - 0xac00) % 28 ? `${word}은` : `${word}는`;
}

/** 사는 곳보다 놀러 가는 곳으로 찾는 도시 */
const TOURIST_CITY = new Set(["gyeongju", "jeonju-hanok-village", "jeju", "gangneung"]);

/**
 * 장소 페이지 제목. "{장소} 날씨"를 맨 앞에 두고, 많이 찾는 검색어(이번주·주말 날씨, 물때표)와 훅을 레저별로 붙인다.
 * "16일"은 쓰지 않는다 (16일자 날씨로 읽힐 수 있어서). 모든 검색 제목은 필수 검색어 + 훅(B급 유머) (SK 2026-10-22).
 * (네이버·구글 자동완성 기준 2026-10-20: "○○ 이번주 날씨", "○○ 주말 날씨", "○○ 물때표", "○○ 해수욕장 날씨", "○○ 스키장 날씨")
 */
export function placeTitle(p: Place): string {
  switch (p.leisure) {
    case "camping":
      return `${p.name} 날씨 · 이번주·주말 캠핑, 텐트 날아갈 일 없을까?`;
    case "fishing":
      return `${p.name} 물때표 · 오늘 몇 물? 만조·간조 시간과 바다 날씨`;
    case "hiking":
      return `${p.name} 날씨 · 등산 전 꼭 확인! 정상 체감온도·칼바람은?${p.elevation ? ` (해발 ${p.elevation.toLocaleString()}m)` : ""}`;
    case "cycling":
      return `${p.name} 날씨 · 라이딩 전 확인! 맞바람에 울 일 있을까?`;
    case "ski":
      return `${p.name} 날씨 · 이번주 스키장 눈 소식, 연차 쓸 각?`;
    case "travel":
      // 같은 "여행"이라도 찾는 목적이 다르다: 바다는 물놀이·사진, 관광지는 여행 동선, 사는 도시는 생활(세차·빨래)
      if (/해수욕장|해변/.test(p.name)) return `${p.name} 날씨 · 이번주 바다 가면 인생샷? 산발샷?`;
      if (TOURIST_CITY.has(p.slug)) return `${p.name} 날씨 · 이번주·주말 여행, 우산 들고 다닐 각?`;
      return `${p.name} 날씨 · 이번주·주말, 세차해도 될까요?`;
    default:
      return `${p.name} 날씨 · 이번주 ${getLeisure(p.leisure).label}, 하늘이 허락할까?`;
  }
}

export function placeDescription(p: Place): string {
  const l = getLeisure(p.leisure);
  const extra =
    p.leisure === "hiking"
      ? "정상 고도로 보정한 기온과 돌풍, 일출 시간을"
      : p.leisure === "fishing"
        ? "물때표(만조·간조), 파고, 풍속·풍향과 돌풍을"
        : "기온·체감온도·비·돌풍과 일몰 시간을";
  return `${p.name}(${p.region}) 이번주·주말 날씨를 3시간 간격으로. ${extra} ${l.label}에 맞게 한눈에 보여드리고, 여행 일정을 날씨로 계획할 수 있습니다.`;
}

/** 주말이 맑을 때·비 올 때·바람 셀 때 레저별 한마디 (검색 설명 끝에 붙는 훅) */
const WEEKEND_HOOK: Record<string, { good: string; rain: string; wind: string }> = {
  camping: { good: "불멍 각, 장작 넉넉히!", rain: "타프 없으면 우중 캠핑 체험판", wind: "팩 단단히, 텐트가 연 될 수도" },
  fishing: { good: "물때만 맞추면 쿨러 채울 각", rain: "비 맞으며 손맛 볼 각오?", wind: "배 뜰지부터 확인 필수" },
  hiking: { good: "정상 인증샷 각!", rain: "우비 없으면 물에 빠진 생쥐", wind: "능선 칼바람, 장갑 챙기세요" },
  cycling: { good: "라이딩 각, 바람도 순할 듯", rain: "엉덩이 물벼락 주의", wind: "맞바람에 허벅지 터질 각" },
  ski: { good: "설질 좋을 때 연차 쓸 각", rain: "슬로프에 비? 눈인지 확인부터", wind: "리프트 멈출 수도, 확인 필수" },
  golf: { good: "OB 나면 순전히 실력 탓", rain: "우중 라운딩, 그립 미끄럼 주의", wind: "OB는 바람 탓 해도 됨" },
  travel: { good: "나들이 가기 딱 좋은 날", rain: "우산 챙기거나 실내 코스로", wind: "모자 날아갈 각, 꽉 잡으세요" },
};

/**
 * 검색 결과 설명. 늘 같은 소개 문장보다 실제 주말 예보 숫자가 보여야 누른다 (CTR 개선, 2026-10-26).
 * 예보를 못 가져오면 기본 소개 문장(placeDescription).
 */
export function placeLiveDescription(p: Place, f: Forecast | null, now = new Date()): string {
  if (!f) return placeDescription(p);
  const today = kstDate(now, f.utcOffset);
  const weekend = f.days.filter((d) => inPeriod(d.date, presetPeriod("weekend", today)));
  if (!weekend.length) return placeDescription(p);
  const md = (date: string) => shortDateKo(date).replace(/\(.*\)/, "");
  const when = weekend.length > 1 ? `${md(weekend[0].date)}~${md(weekend[weekend.length - 1].date)}` : md(weekend[0].date);
  const lo = Math.round(Math.min(...weekend.map((d) => d.tMin ?? 99)));
  const hi = Math.round(Math.max(...weekend.map((d) => d.tMax ?? -99)));
  const rain = Math.round(weekend.reduce((a, d) => a + d.precipSum, 0));
  const gust = Math.round(Math.max(...weekend.map((d) => d.gustMax ?? 0)));
  const sky = codeInfo(weekend[0].code).label;
  const hook = WEEKEND_HOOK[p.leisure] ?? WEEKEND_HOOK.travel;
  const pick = rain >= 5 ? hook.rain : gust >= 12 ? hook.wind : hook.good;
  const line = /[!?]$/.test(pick) ? pick : `${pick}.`;
  const extra =
    p.leisure === "hiking"
      ? "정상 고도 보정 기온·돌풍"
      : p.leisure === "fishing"
        ? "물때표·만조·간조·파고"
        : "기온·비·바람";
  return `${p.name} 이번 주말(${when}) ${sky}, ${lo}~${hi}°, 비 ${rain}mm, 돌풍 ${gust}m/s. ${line} ${extra}, 3시간 간격으로 한눈에.`;
}

/**
 * 구조화 데이터의 장소 종류. 검색엔진·광고가 날씨 페이지가 아니라 여행지(캠핑장·스키장·해변·산) 페이지로 읽게 한다.
 * (화면에는 보이지 않는다)
 */
export function placeSchemaType(p: Pick<Place, "name" | "slug" | "leisure">): string {
  if (/해수욕장|해변/.test(p.name)) return "Beach";
  switch (p.leisure) {
    case "camping":
      return "Campground";
    case "ski":
      return "SkiResort";
    case "hiking":
      return "Mountain";
    default:
      return "TouristDestination";
  }
}

/** 검색엔진과 사용자에게 보여줄 요약 문장 (서버에서 렌더링) */
export function placeSummary(p: Pick<Place, "name" | "leisure">, f: Forecast, now = new Date()): string[] {
  const l = getLeisure(p.leisure);
  // 해외 여행지는 현지 날짜 기준
  const today = kstDate(now, f.utcOffset);
  const lines: string[] = [];
  const wk = presetPeriod("weekend", today);
  const weekend = f.days.filter((d) => inPeriod(d.date, wk));
  if (weekend.length) {
    const lo = Math.min(...weekend.map((d) => d.tMin ?? 99));
    const hi = Math.max(...weekend.map((d) => d.tMax ?? -99));
    const rain = Math.round(weekend.reduce((a, d) => a + d.precipSum, 0) * 10) / 10;
    const gust = Math.max(...weekend.map((d) => d.gustMax ?? 0));
    const sky = codeInfo(weekend[0].code).label;
    lines.push(
      `이번 주말 ${weekend.map((d) => shortDateKo(d.date)).join("~")} ${topic(p.name)} ${sky}, 기온 ${Math.round(lo)}~${Math.round(hi)}°, ` +
        `강수 ${rain}mm, 최대 돌풍 ${Math.round(gust)}m/s로 예보되었습니다.`,
    );
  }
  const dry = f.days.filter((d) => d.precipSum < 1);
  lines.push(
    `앞으로 ${f.days.length}일 중 비 예보가 없는 날은 ${dry.length}일이며, ${l.label} 일정은 기온·바람·강수를 3시간 간격으로 비교해 보세요.`,
  );
  const first = f.days[0];
  if (first?.sunrise && first.sunset) lines.push(`오늘 일출은 ${first.sunrise}, 일몰은 ${first.sunset}입니다.`);
  return lines;
}
