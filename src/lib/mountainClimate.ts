import data from "@/data/mountain-climate.json";
import { monthSpans } from "@/lib/golfIntro";

/**
 * 명산 정상 평년 날씨 한 줄 (산마다 다른 숫자, 2026-11-24).
 * NASA POWER 월별 평년값을 정상 해발로 보정한 값 (collector/mountain_climate.py).
 * 바람은 격자(낮은 곳) 값이라 정상 바람과 달라 쓰지 않는다.
 */
interface Clim {
  hi: number[];
  lo: number[];
  rain: number[];
}

const CLIMATE = data as Record<string, Clim>;
const r = (v: number) => Math.round(v);

export function mountainClimateLine(slug: string): string | null {
  const c = CLIMATE[slug];
  if (!c) return null;
  const parts = [`1월은 낮 ${r(c.hi[0])}° · 밤 ${r(c.lo[0])}°, 8월은 낮 ${r(c.hi[7])}° · 밤 ${r(c.lo[7])}° 안팎이에요.`];
  const frost = c.lo.map((l, i) => ({ m: i + 1, l })).filter((x) => x.l < 0).map((x) => x.m);
  const freezeDay = c.hi.map((h, i) => ({ m: i + 1, h })).filter((x) => x.h < 0).map((x) => x.m);
  if (frost.length) parts.push(`밤 기온이 영하로 내려가는 달은 ${monthSpans(frost)}이에요.`);
  if (freezeDay.length) parts.push(`${monthSpans(freezeDay)}은 한낮 평균도 영하라 눈과 얼음이 오래 남아요.`);
  const wet = c.rain.indexOf(Math.max(...c.rain)) + 1;
  parts.push(`비는 ${wet}월(평년 약 ${c.rain[wet - 1]}mm)에 가장 많아요.`);
  return parts.join(" ");
}
