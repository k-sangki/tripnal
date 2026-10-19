import type { DayForecast } from "@/lib/weather/types";

export type LeisureId = "camping" | "fishing" | "hiking" | "cycling" | "travel";
export type MetricKey = "temp" | "feels" | "precip" | "cloud" | "wind" | "gust";

export interface Leisure {
  id: LeisureId;
  label: string;
  emoji: string;
  /** 3시간 칸에서 크게 강조할 지표 */
  emphasis: MetricKey[];
  /** 3시간 칸 행 순서 (기온은 항상 맨 위) */
  order: MetricKey[];
  /** 일출·일몰 중 크게 보여줄 것 */
  sun: "sunrise" | "sunset" | "both";
}

export const LEISURES: Leisure[] = [
  { id: "camping", label: "캠핑", emoji: "🏕️", emphasis: ["feels", "precip", "gust"], order: ["feels", "precip", "gust", "wind", "cloud"], sun: "sunset" },
  { id: "fishing", label: "낚시", emoji: "🎣", emphasis: ["wind", "gust"], order: ["wind", "gust", "precip", "cloud", "feels"], sun: "sunrise" },
  { id: "hiking", label: "등산", emoji: "⛰️", emphasis: ["feels", "gust", "precip"], order: ["feels", "gust", "precip", "wind", "cloud"], sun: "both" },
  { id: "cycling", label: "사이클", emoji: "🚴", emphasis: ["wind", "gust", "precip"], order: ["wind", "gust", "precip", "feels", "cloud"], sun: "both" },
  { id: "travel", label: "여행", emoji: "🧳", emphasis: ["precip", "cloud"], order: ["precip", "cloud", "feels", "wind", "gust"], sun: "sunset" },
];

export function getLeisure(id: string | null | undefined): Leisure {
  return LEISURES.find((l) => l.id === id) ?? LEISURES[0];
}

export const METRIC_LABEL: Record<MetricKey, string> = {
  temp: "기온",
  feels: "체감",
  precip: "강수",
  cloud: "구름",
  wind: "풍속",
  gust: "돌풍",
};

export type Grade = "good" | "fair" | "bad";

export interface DayScore {
  grade: Grade;
  label: string;
  reasons: string[];
}

interface Rule {
  when: (d: DayForecast) => boolean;
  penalty: number;
  reason: (d: DayForecast) => string;
}

const rain = (mm: number, p: number): Rule => ({
  when: (d) => d.precipSum >= mm,
  penalty: p,
  reason: (d) => `비 ${d.precipSum}mm`,
});
const gust = (ms: number, p: number): Rule => ({
  when: (d) => (d.gustMax ?? 0) >= ms,
  penalty: p,
  reason: (d) => `돌풍 ${d.gustMax}m/s`,
});
const wind = (ms: number, p: number): Rule => ({
  when: (d) => (d.windMax ?? 0) >= ms,
  penalty: p,
  reason: (d) => `바람 ${d.windMax}m/s`,
});
const cold = (c: number, p: number): Rule => ({
  when: (d) => d.tMin != null && d.tMin <= c,
  penalty: p,
  reason: (d) => `최저 ${d.tMin}°`,
});
const hot = (c: number, p: number): Rule => ({
  when: (d) => d.tMax != null && d.tMax >= c,
  penalty: p,
  reason: (d) => `최고 ${d.tMax}°`,
});

/** 레저별 감점 규칙. 같은 항목은 더 심한 규칙 하나만 적용된다(배열 앞쪽이 더 심함). */
const RULES: Record<LeisureId, Rule[][]> = {
  camping: [[rain(10, 60), rain(1, 30)], [gust(14, 50), gust(10, 25)], [cold(-5, 40), cold(3, 15)], [hot(33, 25)]],
  fishing: [[wind(10, 60), wind(7, 35)], [gust(14, 40), gust(10, 20)], [rain(10, 40), rain(2, 15)], [cold(-5, 20)]],
  hiking: [[rain(10, 60), rain(2, 30)], [gust(17, 50), gust(12, 25)], [cold(-10, 40), cold(-3, 15)], [hot(32, 30)]],
  cycling: [[rain(3, 60), rain(0.5, 35)], [wind(9, 45), wind(6, 25)], [gust(12, 20)], [cold(0, 25)], [hot(32, 30)]],
  travel: [[rain(10, 50), rain(1, 25)], [gust(14, 30)], [cold(-8, 25)], [hot(34, 25)]],
};

export function scoreDay(day: DayForecast, leisure: LeisureId): DayScore {
  let score = 100;
  const reasons: string[] = [];
  for (const group of RULES[leisure]) {
    const hit = group.find((r) => r.when(day));
    if (hit) {
      score -= hit.penalty;
      reasons.push(hit.reason(day));
    }
  }
  if (score >= 75) return { grade: "good", label: "좋음", reasons };
  if (score >= 45) return { grade: "fair", label: "보통", reasons };
  return { grade: "bad", label: "나쁨", reasons };
}
