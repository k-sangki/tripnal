import type { Slot } from "@/lib/weather/types";

/**
 * 원자료로 바로 오지 않는 지표를 기온·강수·바람 등에서 계산한다.
 * 화면에 "참고용 판단"으로만 쓴다.
 */
export interface Level {
  /** 0 없음 · 1 낮음 · 2 보통 · 3 높음 */
  level: 0 | 1 | 2 | 3;
  text: string;
}

const wet = (s: Slot) => (s.precip ?? 0) >= 0.1;

/** 낙뢰 가능성: 뇌우 예보 코드 또는 대기 불안정도(CAPE) */
export function thunderLevel(s: Slot): Level {
  if ((s.code ?? 0) >= 95) return { level: 3, text: "높음" };
  const cape = s.cape ?? 0;
  if (cape >= 1500) return { level: 2, text: "보통" };
  if (cape >= 500) return { level: 1, text: "낮음" };
  return { level: 0, text: "-" };
}

/** 노면: 눈·결빙·젖음·건조 */
export function roadState(s: Slot): Level {
  const t = s.temp ?? 10;
  if ((s.snow ?? 0) >= 0.1) return { level: 3, text: "눈길" };
  if (t <= 0 && wet(s)) return { level: 3, text: "빙판" };
  if (t <= 1) return { level: 2, text: "살얼음" };
  if (wet(s)) return { level: 1, text: "젖음" };
  return { level: 0, text: "건조" };
}

/** 결빙 위험 */
export function iceRisk(s: Slot): Level {
  const t = s.temp ?? 10;
  if (t <= -3 || (t <= 0 && wet(s))) return { level: 3, text: "위험" };
  if (t <= 0) return { level: 2, text: "주의" };
  if (t <= 2) return { level: 1, text: "약함" };
  return { level: 0, text: "-" };
}

/** 기류(난류): 돌풍과 평균 풍속의 차이가 클수록 바람이 거칠다 */
export function turbulence(s: Slot): Level {
  if (s.wind == null || s.gust == null) return { level: 0, text: "-" };
  const spread = s.gust - s.wind;
  if (spread >= 7 || s.wind >= 10) return { level: 3, text: "거침" };
  if (spread >= 4 || s.wind >= 7) return { level: 2, text: "보통" };
  return { level: 1, text: "안정" };
}

/** 미세먼지 단계 (환경부 기준) */
export function pmLevel(v: number | null, kind: "pm10" | "pm25"): 0 | 1 | 2 | 3 | null {
  if (v == null) return null;
  const [a, b, c] = kind === "pm10" ? [30, 80, 150] : [15, 35, 75];
  return v <= a ? 0 : v <= b ? 1 : v <= c ? 2 : 3;
}

/** 자외선 단계 (WHO): 0 낮음 · 1 보통 · 2 높음 · 3 매우 높음 · 4 위험 */
export function uvLevel(v: number | null): number | null {
  if (v == null) return null;
  return v < 3 ? 0 : v < 6 ? 1 : v < 8 ? 2 : v < 11 ? 3 : 4;
}
