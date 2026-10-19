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
  temp: "°",
  feels: "°",
  precip: "mm",
  cloud: "%",
  wind: "m/s",
  gust: "m/s",
};

export function WindArrow({ dir }: { dir: number | null }) {
  return (
    <span className="arrow" style={{ transform: `rotate(${dir ?? 0}deg)` }} aria-label={`${windDirKo(dir)}풍`}>
      ↓
    </span>
  );
}

/** 표의 지표 칸 하나 */
export function Cell({ slot, metric }: { slot: Slot; metric: MetricKey }) {
  switch (metric) {
    case "temp":
      return <td>{fmt(slot.temp, "°")}</td>;
    case "feels":
      return <td className={slot.feels != null && slot.feels <= 0 ? "v-rain" : undefined}>{fmt(slot.feels, "°")}</td>;
    case "precip": {
      const p = slot.precip;
      if (p == null) return <td className="v-none">-</td>;
      if (p < 0.1) {
        // 강수가 없을 때는 확률이 높으면 확률을 보여준다
        return slot.precipProb != null && slot.precipProb >= 30 ? (
          <td className="v-rain v-prob">{slot.precipProb}%</td>
        ) : (
          <td className="v-none">·</td>
        );
      }
      return <td className="v-rain">{rainText(p)}</td>;
    }
    case "cloud":
      return <td>{fmt(slot.cloud)}</td>;
    case "wind":
      return (
        <td className={slot.wind != null && slot.wind >= 7 ? "v-warn" : undefined} title={windDirKo(slot.windDir)}>
          <WindArrow dir={slot.windDir} />
          {fmt(slot.wind)}
        </td>
      );
    case "gust":
      return <td className={slot.gust != null && slot.gust >= 10 ? "v-warn" : undefined}>{fmt(slot.gust)}</td>;
  }
}
