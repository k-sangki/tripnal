import type { CSSProperties } from "react";
import { iceRisk, pmLevel, roadState, thunderLevel, turbulence, uvLevel } from "@/lib/derived";
import { windDirKo } from "@/lib/weather/codes";
import type { MetricKey } from "@/lib/leisure";
import type { Slot } from "@/lib/weather/types";

export function fmt(v: number | null, unit = "") {
  return v == null ? "-" : `${Math.round(v)}${unit}`;
}

export function rainText(mm: number) {
  return mm < 10 ? mm.toFixed(1) : String(Math.round(mm));
}

export const UNIT: Record<MetricKey, string> = {
  temp: "°C",
  feels: "°C",
  precip: "mm",
  precipProb: "%",
  cloud: "%",
  wind: "m/s",
  gust: "m/s",
  wave: "m",
  windWave: "m",
  tide: "m",
  snow: "cm",
  ice: "",
  road: "",
  thunder: "가능성",
  visibility: "km",
  uv: "지수",
  pm10: "㎍/㎥",
  pm25: "㎍/㎥",
  windDir: "",
  turbulence: "",
  range: "°C",
};

/** 바람 세기 색 (m/s 기준점 사이를 자연스럽게 섞는다) */
const WIND_STOPS: [number, string][] = [
  [0, "#ffffff"],
  [2, "#f1fbf6"],
  [4, "#c9f0dc"],
  [6, "#fff0a8"],
  [8, "#ffd08a"],
  [10, "#ffa98c"],
  [13, "#f2789e"],
  [17, "#b45ad6"],
];

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  const m = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `#${m.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function windColor(v: number): string {
  if (v <= WIND_STOPS[0][0]) return WIND_STOPS[0][1];
  for (let i = 1; i < WIND_STOPS.length; i++) {
    const [x1, c1] = WIND_STOPS[i];
    const [x0, c0] = WIND_STOPS[i - 1];
    if (v <= x1) return mix(c0, c1, (v - x0) / (x1 - x0));
  }
  return WIND_STOPS[WIND_STOPS.length - 1][1];
}

/** 이웃 칸과 색이 끊기지 않도록 가로 그라데이션 배경을 만든다 */
export function bandStyle(prev: number | null, cur: number | null, next: number | null): CSSProperties | undefined {
  if (cur == null) return undefined;
  const c = windColor(cur);
  const l = prev == null ? c : windColor((prev + cur) / 2);
  const r = next == null ? c : windColor((cur + next) / 2);
  return { background: `linear-gradient(90deg, ${l}, ${c} 50%, ${r})`, color: cur >= 13 ? "#fff" : undefined };
}

/** 강수 단계 (mm/칸) */
export function rainLevel(v: number | null): number {
  if (v == null || v < 0.1) return 0;
  if (v < 1) return 1;
  if (v < 5) return 2;
  return 3;
}

export function WindArrow({ dir }: { dir: number | null }) {
  return (
    <span className="arrow" style={{ transform: `rotate(${dir ?? 0}deg)` }} aria-label={`${windDirKo(dir)}풍`}>
      ↓
    </span>
  );
}

/** 표에 들어갈 값 하나의 글자와 색 단계 */
export function cellValue(slot: Slot, metric: MetricKey): { text: string; cls?: string } {
  const none = { text: "-", cls: "v-none" };
  switch (metric) {
    case "temp":
      return { text: fmt(slot.temp, "°") };
    case "feels":
      return { text: fmt(slot.feels, "°"), cls: slot.feels != null && slot.feels <= 0 ? "v-cold" : undefined };
    case "precip": {
      const p = slot.precip;
      if (p == null) return none;
      if (p < 0.1) return { text: "·", cls: "v-none" };
      return { text: rainText(p), cls: `r${rainLevel(p)}` };
    }
    case "precipProb": {
      const v = slot.precipProb;
      if (v == null) return none;
      return { text: String(v), cls: v >= 60 ? "p-hi" : v >= 30 ? "p-mid" : "v-none" };
    }
    case "cloud":
      return { text: fmt(slot.cloud) };
    case "wind":
      return { text: fmt(slot.wind) };
    case "gust":
      return { text: fmt(slot.gust) };
    case "wave":
    case "windWave": {
      const v = metric === "wave" ? slot.wave : slot.windWave;
      if (v == null) return none;
      return { text: v.toFixed(1), cls: `wv${v < 0.5 ? 0 : v < 1 ? 1 : v < 2 ? 2 : 3}` };
    }
    case "tide": {
      const v = slot.tide;
      if (v == null) return none;
      return { text: `${v > 0 ? "+" : ""}${v.toFixed(1)}`, cls: v >= 0.5 ? "td-hi" : v <= -0.5 ? "td-lo" : "td-mid" };
    }
    case "snow": {
      const v = slot.snow;
      if (v == null) return none;
      if (v < 0.1) return { text: "·", cls: "v-none" };
      return { text: v.toFixed(1), cls: v >= 5 ? "sn2" : "sn1" };
    }
    case "visibility": {
      const v = slot.visibility;
      if (v == null) return none;
      return { text: v >= 20 ? "20+" : v < 10 ? v.toFixed(1) : String(Math.round(v)), cls: v < 1 ? "lv3" : v < 3 ? "lv2" : v < 10 ? "lv1" : undefined };
    }
    case "uv": {
      const v = slot.uv;
      if (v == null) return none;
      return { text: String(Math.round(v)), cls: `uv${uvLevel(v)}` };
    }
    case "pm10":
    case "pm25": {
      const v = slot[metric];
      const lv = pmLevel(v, metric);
      if (v == null || lv == null) return none;
      return { text: String(Math.round(v)), cls: `pm${lv}` };
    }
    case "windDir":
      return { text: windDirKo(slot.windDir) };
    case "thunder":
    case "road":
    case "ice":
    case "turbulence": {
      const fn = { thunder: thunderLevel, road: roadState, ice: iceRisk, turbulence }[metric];
      const r = fn(slot);
      return { text: r.text, cls: r.level ? `lv${r.level}` : "v-none" };
    }
    case "range":
      return none;
  }
}

/**
 * 표의 지표 칸 하나.
 * mark: 그날 가장 높은/낮은 기온 칸, style: 바람 색띠
 */
export function Cell({
  slot,
  metric,
  className,
  mark,
  style,
}: {
  slot: Slot;
  metric: MetricKey;
  className?: string;
  mark?: "max" | "min";
  style?: CSSProperties;
}) {
  const v = cellValue(slot, metric);
  const cls = [className, v.cls, metric === "temp" && mark ? `t-${mark}` : undefined].filter(Boolean).join(" ") || undefined;
  if (metric === "wind" || metric === "windDir") {
    return (
      <td className={cls} style={style} title={`${windDirKo(slot.windDir)}풍`}>
        <WindArrow dir={slot.windDir} />
        {v.text}
      </td>
    );
  }
  return (
    <td className={cls} style={style}>
      {v.text}
    </td>
  );
}
