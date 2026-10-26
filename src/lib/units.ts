import type { Locale } from "./i18n";

/**
 * 표시 단위. 자료와 색 기준(바람 색띠, 영하 표시 등)은 언제나 °C·m/s이고, 글자만 바꿔 보여준다.
 * 영어는 바람을 km/h로, 기온은 °C 기본에 °F를 고를 수 있다. 한국어·일본어는 °C·m/s.
 */
export interface Units {
  temp: "C" | "F";
  wind: "ms" | "kmh";
}

export const METRIC: Units = { temp: "C", wind: "ms" };

export function defaultUnits(l: Locale): Units {
  return l === "en" ? { temp: "C", wind: "kmh" } : METRIC;
}

export function tempIn(c: number, u: Units): number {
  return u.temp === "F" ? (c * 9) / 5 + 32 : c;
}

/** 기온 차이(일교차·예보 변화) */
export function tempDiffIn(d: number, u: Units): number {
  return u.temp === "F" ? (d * 9) / 5 : d;
}

export function windIn(ms: number, u: Units): number {
  return u.wind === "kmh" ? ms * 3.6 : ms;
}

export function tempUnit(u: Units): string {
  return u.temp === "F" ? "°F" : "°C";
}

export function windUnit(u: Units): string {
  return u.wind === "kmh" ? "km/h" : "m/s";
}
