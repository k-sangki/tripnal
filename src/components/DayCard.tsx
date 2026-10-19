import { codeIcon, codeInfo } from "@/lib/weather/codes";
import { METRIC_LABEL, scoreDay, type Leisure, type MetricKey } from "@/lib/leisure";
import { isPast, regroup, slotHead } from "@/lib/interval";
import { shortDateKo, weekday } from "@/lib/time";
import type { DayForecast } from "@/lib/weather/types";
import { Cell, UNIT, fmt } from "./cells";

interface Props {
  day: DayForecast;
  leisure: Leisure;
  isToday: boolean;
  nowHour: number;
  /** 칸 간격(시간): 3, 6, 12 */
  step: number;
}

export function DayCard({ day, leisure, isToday, nowHour, step }: Props) {
  const all = regroup(day.slots, step);
  const slots = isToday ? all.filter((s) => !isPast(s.hour, step, nowHour)) : all;
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
        <table className={`slots s${step}`} style={slots.length < 4 ? { width: "auto", minWidth: 0 } : undefined}>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">시각</span>
              </th>
              {slots.map((s) => (
                <th scope="col" key={s.time}>
                  {slotHead(s.hour, step)}
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
