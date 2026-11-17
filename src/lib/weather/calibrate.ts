import { KST_OFFSET_MIN } from "@/lib/time";

type Num = number | null;

/**
 * 관측으로 배운 예보 보정 (2026-11 정확도 분석, /mnt/project-files/analysis/forecast-accuracy-2026-11.md).
 * 한국 안에서만 쓴다.
 */

/** collector/verify.py calib 이 남기는 verify/calib/latest.json */
export interface TempCalib {
  generated: string;
  /** 관측소: [위도, 경도, 해발고도] */
  stations: Record<string, [number, number, number]>;
  /** 모델별 관측소별 KST 0·3·…·21시 기온 치우침 (예보 − 관측, °C) */
  temp: Record<string, Record<string, number[]>>;
}

/** 이 거리(km) 안의 관측소만 쓴다 */
const NEAR_KM = 80;
/** 관측소와 고도 차가 이만큼(m)부터 보정을 줄이기 시작해 두 배에서 없앤다 (산 정상은 관측소와 하루 기온 변화가 다르다) */
const ELEV_FADE_M = 400;
/** 예보 며칠째부터 보정을 줄여 며칠째에 없앤다 (멀리 갈수록 치우침보다 날씨 자체가 틀린다) */
const LEAD_FULL_DAYS = 5;
const LEAD_ZERO_DAYS = 10;

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const x = (lon2 - lon1) * r * Math.cos(((lat1 + lat2) / 2) * r);
  const y = (lat2 - lat1) * r;
  return Math.hypot(x, y) * 6371;
}

/**
 * 지점에 쓸 관측소별 가중치. 거리 제곱에 반비례(아주 가까우면 그 관측소 값이 거의 그대로)하고,
 * 고도 차가 크면 가중치만 줄이고 합은 그대로 나눠 보정이 0 쪽으로 줄게 한다.
 */
export function stationWeights(calib: TempCalib, lat: number, lon: number, elevation: number | null): { sid: string; w: number }[] {
  const near: { sid: string; w: number; fade: number }[] = [];
  for (const [sid, [slat, slon, selev]] of Object.entries(calib.stations)) {
    const km = distanceKm(lat, lon, slat, slon);
    if (km > NEAR_KM) continue;
    const diff = elevation == null ? 0 : Math.abs(elevation - selev);
    const fade = Math.min(1, Math.max(0, (2 * ELEV_FADE_M - diff) / ELEV_FADE_M));
    near.push({ sid, w: 1 / Math.max(km, 2) ** 2, fade });
  }
  const total = near.reduce((a, s) => a + s.w, 0);
  return near.filter((s) => s.fade > 0).map((s) => ({ sid: s.sid, w: (s.w * s.fade) / total }));
}

/** 하루 중 시각(0~23)의 치우침: 3시간 값 사이를 직선으로 (21시와 0시 사이도) */
function atHour(vals: number[], hour: number): number {
  const i = Math.floor(hour / 3) % 8;
  const f = (hour % 3) / 3;
  return vals[i] * (1 - f) + vals[(i + 1) % 8] * f;
}

/**
 * 시각별로 모델 기온에서 뺄 값(°C). 그 모델 기록이 없으면 null.
 * keys: "YYYY-MM-DDTHH:00"(KST)
 */
export function tempCorrection(calib: TempCalib, model: string, weights: { sid: string; w: number }[], keys: string[], now: Date): number[] | null {
  const byStation = calib.temp[model];
  if (!byStation || !weights.length) return null;
  const used = weights.filter((s) => byStation[s.sid]);
  if (!used.length) return null;
  return keys.map((k) => {
    const hour = +k.slice(11, 13);
    const t = Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10), hour) - KST_OFFSET_MIN * 60e3;
    const days = (t - now.getTime()) / 86400e3;
    const lead = days <= LEAD_FULL_DAYS ? 1 : days >= LEAD_ZERO_DAYS ? 0 : (LEAD_ZERO_DAYS - days) / (LEAD_ZERO_DAYS - LEAD_FULL_DAYS);
    if (!lead) return 0;
    const bias = used.reduce((a, s) => a + s.w * atHour(byStation[s.sid], hour), 0);
    return bias * lead;
  });
}

/** 기온을 고친 만큼 이슬점도 기온을 넘지 않게 */
export function applyTempCorrection<T extends { temp: Num[]; dew: Num[] }>(m: T, corr: number[]): T {
  const temp = m.temp.map((x, i) => (x == null ? null : x - corr[i]));
  const dew = m.dew.map((d, i) => (d == null ? null : temp[i] == null ? d : Math.min(d, temp[i]!)));
  return { ...m, temp, dew };
}

/**
 * GEFS 강수 확률을 실제로 비가 온 비율 쪽으로 낮춘다.
 * 4주(2026-10-22~11-15) 사이트 예보에서 50~60%라고 한 칸에 실제 비(0.1mm 이상)가 온 건 33%였다.
 * 기간 앞뒤로 차이가 커서 실제 비율까지 다 내리지 않고 절반만 내린다 (뒤쪽 기간에서도 오차가 줄어드는 만큼).
 */
const PROB_FROM = [0, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const PROB_TO = [0, 20, 28, 34, 41, 48, 56, 66, 79, 94];

export function calibrateProb(p: Num): Num {
  if (p == null) return null;
  const x = Math.min(100, Math.max(0, p));
  let i = 1;
  while (i < PROB_FROM.length - 1 && x > PROB_FROM[i]) i++;
  const f = (x - PROB_FROM[i - 1]) / (PROB_FROM[i] - PROB_FROM[i - 1]);
  return Math.round(PROB_TO[i - 1] + (PROB_TO[i] - PROB_TO[i - 1]) * f);
}
