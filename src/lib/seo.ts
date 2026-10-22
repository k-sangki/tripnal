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

/**
 * 장소 페이지 제목. "{장소} 날씨"를 맨 앞에 두고, 많이 찾는 검색어(이번주·주말 날씨, 물때표, 16일)를 레저별로 붙인다.
 * (네이버·구글 자동완성 기준 2026-10-20: "○○ 이번주 날씨", "○○ 주말 날씨", "○○ 물때표", "○○ 해수욕장 날씨", "○○ 스키장 날씨")
 */
export function placeTitle(p: Place): string {
  switch (p.leisure) {
    case "camping":
      return `${p.name} 날씨 · 이번주·주말 캠핑 날씨 16일`;
    case "fishing":
      return `${p.name} 물때표·바다 날씨 · 이번주 바람·파고 16일`;
    case "hiking":
      return `${p.name} 날씨 · 등산 전 꼭 확인! 정상 체감온도·칼바람은?${p.elevation ? ` (해발 ${p.elevation.toLocaleString()}m)` : ""}`;
    case "cycling":
      return `${p.name} 날씨 · 자전거 라이딩 바람 예보 16일`;
    case "ski":
      return `${p.name} 날씨 · 스키장 이번주 눈·기온 16일`;
    case "travel":
      return `${p.name} 날씨 · 이번주·주말 여행 날씨 16일`;
    default:
      return `${p.name} 날씨 · 이번주 ${getLeisure(p.leisure).label} 날씨 16일`;
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
  return `${p.name}(${p.region}) 오늘부터 16일까지 3시간 간격 날씨. ${extra} ${l.label}에 맞게 한눈에 보여드리고, 이번주·주말 날씨로 여행 일정을 계획할 수 있습니다.`;
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
