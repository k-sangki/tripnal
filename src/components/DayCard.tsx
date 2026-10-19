import { codeIcon, codeInfo, windDirKo } from "@/lib/weather/codes";
import { METRIC_LABEL, scoreDay, type Leisure, type MetricKey } from "@/lib/leisure";
import { shortDateKo, weekday } from "@/lib/time";
import type { DayForecast, Slot } from "@/lib/weather/types";

function fmt(v: number | null, unit = "") {
  return v == null ? "-" : `${Math.round(v)}${unit}`;
}

function Cell({ slot, metric }: { slot: Slot; metric: MetricKey }) {
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
      return <td className="v-rain">{p < 10 ? p.toFixed(1) : Math.round(p)}</td>;
    }
    case "cloud":
      return <td>{fmt(slot.cloud)}</td>;
    case "wind":
      return (
        <td className={slot.wind != null && slot.wind >= 7 ? "v-warn" : undefined} title={windDirKo(slot.windDir)}>
          <span className="arrow" style={{ transform: `rotate(${slot.windDir ?? 0}deg)` }} aria-label={`${windDirKo(slot.windDir)}풍`}>
            ↓
          </span>
          {fmt(slot.wind)}
        </td>
      );
    case "gust":
      return <td className={slot.gust != null && slot.gust >= 10 ? "v-warn" : undefined}>{fmt(slot.gust)}</td>;
  }
}

const UNIT: Record<MetricKey, string> = {
  temp: "°",
  feels: "°",
  precip: "mm",
  cloud: "%",
  wind: "m/s",
  gust: "m/s",
};

export function DayCard({ day, leisure, isToday, nowHour }: { day: DayForecast; leisure: Leisure; isToday: boolean; nowHour: number }) {
  const slots = isToday ? day.slots.filter((s) => s.hour + 3 > nowHour) : day.slots;
  const score = scoreDay(day, leisure.id);
  const wd = weekday(day.date);
  const info = codeInfo(day.code);
  const em = (k: MetricKey) => leisure.emphasis.includes(k);
  const sunEm = (k: "sunrise" | "sunset") => leisure.sun === k || leisure.sun === "both";

  return (
    <article className="card day">
      <div className="day-head">
        <div>
          <div className={`day-date${wd === 6 ? " d-sat" : wd === 0 ? " d-sun" : ""}`}>
            {shortDateKo(day.date)}
            {isToday && <small>오늘</small>}
          </div>
          <div className="day-sky">
            {codeIcon(day.code)} {info.label}
            {day.precipSum >= 0.1 && ` · 강수 ${day.precipSum}mm`}
          </div>
        </div>
        <div className="day-temp">
          <span className={`grade ${score.grade}`}>
            {leisure.emoji} {score.label}
          </span>
          <div>
            <span className="hi">{fmt(day.tMax, "°")}</span>
            <span className="lo">{fmt(day.tMin, "°")}</span>
          </div>
        </div>
      </div>
      {score.reasons.length > 0 && <div className="day-reasons">{score.reasons.join(" · ")}</div>}

      <div className="sunrow">
        <div className={`sun${sunEm("sunrise") ? " em" : ""}`}>
          <span>🌅 일출</span>
          <b>{day.sunrise ?? "-"}</b>
        </div>
        <div className={`sun${sunEm("sunset") ? " em" : ""}`}>
          <span>🌇 일몰</span>
          <b>{day.sunset ?? "-"}</b>
        </div>
      </div>

      <div className="grid-wrap">
        <table className="slots" style={slots.length < 4 ? { width: "auto", minWidth: 0 } : undefined}>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">시각</span>
              </th>
              {slots.map((s) => (
                <th scope="col" key={s.time}>
                  {s.hour}시
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="r-icon">
              <th scope="row">
                <span className="sr-only">날씨</span>
              </th>
              {slots.map((s) => (
                <td key={s.time} title={codeInfo(s.code).label}>
                  {codeIcon(s.code, s.isDay)}
                </td>
              ))}
            </tr>
            <tr className="r-temp">
              <th scope="row">기온</th>
              {slots.map((s) => (
                <Cell key={s.time} slot={s} metric="temp" />
              ))}
            </tr>
            {leisure.order.map((k) => (
              <tr key={k} className={em(k) ? "em" : undefined}>
                <th scope="row" title={UNIT[k]}>
                  {METRIC_LABEL[k]}
                </th>
                {slots.map((s) => (
                  <Cell key={s.time} slot={s} metric={k} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
