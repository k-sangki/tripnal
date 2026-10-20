import { getTimes } from "suncalc";
import { KST_OFFSET_MIN, kstHourMinute, kstNoon } from "@/lib/time";
import type { DayForecast, Forecast, RawForecast, Slot, TideEvent } from "./types";

type Num = number | null;

function round1(v: Num): Num {
  return v == null ? null : Math.round(v * 10) / 10;
}

function present(values: Num[]): number[] {
  return values.filter((v): v is number => v != null && Number.isFinite(v));
}

function max(values: Num[]): Num {
  const xs = present(values);
  return xs.length ? Math.max(...xs) : null;
}

function min(values: Num[]): Num {
  const xs = present(values);
  return xs.length ? Math.min(...xs) : null;
}

function sum(values: Num[]): Num {
  const xs = present(values);
  return xs.length ? xs.reduce((a, b) => a + b, 0) : null;
}

function mean(values: Num[]): Num {
  const xs = present(values);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** 일출·일몰 "HH:MM" (한국 시간, 해외는 offsetMin 현지 시간) */
export function sunTimes(date: string, lat: number, lon: number, offsetMin = KST_OFFSET_MIN) {
  const t = getTimes(kstNoon(date, offsetMin), lat, lon);
  const ok = (d: Date | null): d is Date => d != null && !Number.isNaN(d.getTime());
  return {
    sunrise: ok(t.sunrise) ? kstHourMinute(t.sunrise, offsetMin) : null,
    sunset: ok(t.sunset) ? kstHourMinute(t.sunset, offsetMin) : null,
  };
}

function toMinutes(hm: string | null): number | null {
  if (!hm) return null;
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 시간별 해수면 높이에서 만조·간조를 찾는다.
 * 이웃 세 점에 포물선을 맞춰 분 단위로 보정한다.
 */
export function findTides(time: string[], level: (number | null)[], idx: number[]): TideEvent[] {
  const out: TideEvent[] = [];
  for (const i of idx) {
    const a = level[i - 1];
    const b = level[i];
    const c = level[i + 1];
    if (a == null || b == null || c == null) continue;
    const high = b > a && b >= c;
    const low = b < a && b <= c;
    if (!high && !low) continue;
    const denom = a - 2 * b + c;
    const off = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
    const peak = b - 0.25 * (a - c) * off;
    const minutes = Number(time[i].slice(11, 13)) * 60 + Math.round(off * 60);
    const m = Math.max(0, Math.min(23 * 60 + 59, minutes));
    out.push({
      time: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
      type: high ? "high" : "low",
      level: Math.round(peak * 100) / 100,
    });
  }
  return out;
}

/**
 * 시간 단위 예보를 3시간 칸(00, 03, ..., 21시)과 날짜별로 묶는다.
 * - 기온·체감·풍속·풍향: 칸 시작 시각 값 (순간값)
 * - 강수: 3시간 합, 강수확률·돌풍: 3시간 최대, 구름: 3시간 평균
 * - 날씨 코드: 3시간 중 가장 나쁜 값
 */
export function aggregate(raw: RawForecast, now: Date = new Date()): Forecast {
  const h = raw.hourly;
  const byDate = new Map<string, number[]>();
  h.time.forEach((t, i) => {
    const date = t.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(i);
  });

  const days: DayForecast[] = [];
  for (const [date, idx] of byDate) {
    const sun = sunTimes(date, raw.latitude, raw.longitude, raw.utcOffset);
    const riseMin = toMinutes(sun.sunrise) ?? 6 * 60;
    const setMin = toMinutes(sun.sunset) ?? 18 * 60;

    const slots: Slot[] = [];
    for (const i of idx) {
      const hour = Number(h.time[i].slice(11, 13));
      if (hour % 3 !== 0) continue;
      const span = [i, i + 1, i + 2].filter((j) => j < h.time.length && h.time[j].startsWith(date));
      const pick = <T,>(arr: T[]) => span.map((j) => arr[j]);
      const mid = hour * 60 + 90;
      slots.push({
        time: h.time[i],
        hour,
        temp: round1(h.temperature[i]),
        feels: round1(h.apparentTemperature[i]),
        precip: round1(sum(pick(h.precipitation))),
        precipProb: max(pick(h.precipitationProbability)),
        cloud: mean(pick(h.cloudCover)) == null ? null : Math.round(mean(pick(h.cloudCover))!),
        wind: round1(h.windSpeed[i]),
        gust: round1(max(pick(h.windGusts))),
        windDir: h.windDirection[i],
        code: max(pick(h.weatherCode)),
        isDay: mid >= riseMin && mid <= setMin,
        snow: h.snowfall ? round1(sum(pick(h.snowfall))) : null,
        visibility: h.visibility ? round1(min(pick(h.visibility)) == null ? null : min(pick(h.visibility))! / 1000) : null,
        uv: h.uvIndex ? round1(max(pick(h.uvIndex))) : null,
        cape: h.cape ? max(pick(h.cape)) : null,
        wave: h.waveHeight ? round1(max(pick(h.waveHeight))) : null,
        windWave: h.windWaveHeight ? round1(max(pick(h.windWaveHeight))) : null,
        tide: h.seaLevel?.[i] != null ? Math.round(h.seaLevel[i]! * 100) / 100 : null,
        pm10: h.pm10 ? max(pick(h.pm10)) : null,
        pm25: h.pm25 ? max(pick(h.pm25)) : null,
      });
    }
    if (slots.length === 0) continue;

    const daytime = slots.filter((s) => s.hour >= 6 && s.hour <= 18);
    days.push({
      date,
      slots,
      tMin: round1(min(idx.map((i) => h.temperature[i]))),
      tMax: round1(max(idx.map((i) => h.temperature[i]))),
      precipSum: round1(sum(idx.map((i) => h.precipitation[i]))) ?? 0,
      precipProbMax: max(idx.map((i) => h.precipitationProbability[i])),
      windMax: round1(max(idx.map((i) => h.windSpeed[i]))),
      gustMax: round1(max(idx.map((i) => h.windGusts[i]))),
      code: max((daytime.length ? daytime : slots).map((s) => s.code)),
      sunrise: sun.sunrise,
      sunset: sun.sunset,
      predictability: raw.predictability?.[date] ?? null,
      change: raw.change?.[date] ?? null,
      tides: raw.tideEvents
        ? raw.tideEvents.filter((e) => e.at.startsWith(date)).map((e) => ({ time: e.at.slice(11, 16), type: e.type, level: e.level }))
        : h.seaLevel
          ? findTides(h.time, h.seaLevel, idx)
          : [],
    });
  }

  return {
    latitude: raw.latitude,
    longitude: raw.longitude,
    elevation: raw.elevation,
    ...(raw.utcOffset != null && raw.utcOffset !== KST_OFFSET_MIN ? { utcOffset: raw.utcOffset } : {}),
    source: raw.source,
    generatedAt: now.toISOString(),
    days,
  };
}
