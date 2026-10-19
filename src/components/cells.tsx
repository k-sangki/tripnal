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
};

/** 바람 세기 단계 (m/s): 0 약함 · 1 산들 · 2 다소 강함 · 3 강함 · 4 매우 강함 · 5 위험 */
export function windLevel(v: number | null): number {
  if (v == null) return 0;
  if (v < 3) return 0;
  if (v < 5) return 1;
  if (v < 7) return 2;
  if (v < 10) return 3;
  if (v < 14) return 4;
  return 5;
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

/**
 * 표의 지표 칸 하나.
 * mark: 그날 가장 높은/낮은 기온 칸 표시
 */
export function Cell({ slot, metric, className, mark }: { slot: Slot; metric: MetricKey; className?: string; mark?: "max" | "min" }) {
  const c = (extra?: string) => [className, extra].filter(Boolean).join(" ") || undefined;
  switch (metric) {
    case "temp":
      return <td className={c(mark ? `t-${mark}` : undefined)}>{fmt(slot.temp, "°")}</td>;
    case "feels":
      return <td className={c(slot.feels != null && slot.feels <= 0 ? "v-cold" : undefined)}>{fmt(slot.feels, "°")}</td>;
    case "precip": {
      const p = slot.precip;
      if (p == null) return <td className={c("v-none")}>-</td>;
      if (p < 0.1) return <td className={c("v-none")}>·</td>;
      return <td className={c(`r${rainLevel(p)}`)}>{rainText(p)}</td>;
    }
    case "precipProb": {
      const v = slot.precipProb;
      if (v == null) return <td className={c("v-none")}>-</td>;
      return <td className={c(v >= 60 ? "p-hi" : v >= 30 ? "p-mid" : "v-none")}>{v}</td>;
    }
    case "cloud":
      return <td className={c()}>{fmt(slot.cloud)}</td>;
    case "wind":
      return (
        <td className={c(`w${windLevel(slot.wind)}`)} title={`${windDirKo(slot.windDir)}풍`}>
          <WindArrow dir={slot.windDir} />
          {fmt(slot.wind)}
        </td>
      );
    case "gust":
      return <td className={c(`w${windLevel(slot.gust)}`)}>{fmt(slot.gust)}</td>;
  }
}
