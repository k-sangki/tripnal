"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { scoreDay, type Leisure, type MetricKey } from "@/lib/leisure";
import { daySummary, intervalLong, isPast, regroup, slotHead, slotHours, stepHours, type Interval } from "@/lib/interval";
import { periodLabel, type Period } from "@/lib/period";
import { weekday, weekdayKo } from "@/lib/time";
import { codeIcon, codeInfo } from "@/lib/weather/codes";
import type { DayForecast, Slot } from "@/lib/weather/types";
import { WindArrow, fmt, rainText } from "./cells";
import { Logo } from "./Logo";

interface Props {
  frameRef: React.Ref<HTMLDivElement>;
  days: DayForecast[];
  leisure: Leisure;
  interval: Interval;
  period: Period;
  today: string;
  nowHour: number;
  placeName: string;
  address?: string;
  elevation: number | null;
  source: string;
}

const GAP = 14;
/** 날짜가 적을 때 너무 크게 키우지 않는다 */
const MAX_ZOOM = 1.8;

/**
 * 캡처 이미지 크기: 지금 기기의 화면 한 장.
 * 모바일은 휴대폰 화면 비율, PC는 모니터 해상도(1280~2560px 폭)에 맞춘다.
 */
function frameSize() {
  const sw = window.screen?.width || window.innerWidth;
  const sh = window.screen?.height || window.innerHeight;
  const w = Math.min(2560, sw);
  return { w, h: Math.round((w * sh) / sw) };
}

function wdClass(date: string) {
  const w = weekday(date);
  return w === 6 ? "d-sat" : w === 0 ? "d-sun" : undefined;
}

function RainLine({ s, em }: { s: Slot; em: boolean }) {
  const cls = `cl-rain${em ? " em" : ""}`;
  if (s.precip != null && s.precip >= 0.1) return <span className={cls}>{rainText(s.precip)}mm</span>;
  if (s.precipProb != null && s.precipProb >= 30) return <span className={`${cls} prob`}>{s.precipProb}%</span>;
  return <span className="cl-rain">&nbsp;</span>;
}

function WindLine({ s, em }: { s: Slot; em: boolean }) {
  return (
    <span className={`cl-wind${em ? " em" : ""}${(s.wind ?? 0) >= 7 || (s.gust ?? 0) >= 10 ? " warn" : ""}`}>
      <WindArrow dir={s.windDir} />
      {fmt(s.wind)}
      <small>/{fmt(s.gust)}</small>
    </span>
  );
}

function DateCell({ d, leisure, today, withTemp }: { d: DayForecast; leisure: Leisure; today: string; withTemp: boolean }) {
  const score = scoreDay(d, leisure.id);
  return (
    <th scope="row" className="cf-date">
      <span className={wdClass(d.date)}>
        <b>{d.date === today ? "오늘" : `${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8))}`}</b>
        <small>{weekdayKo(d.date)}</small>
      </span>
      <i className={`gdot ${score.grade}`}>{score.label}</i>
      {withTemp && (
        <span className="cf-hl">
          <span className="v-hi">{fmt(d.tMax, "°")}</span> <span className="v-lo">{fmt(d.tMin, "°")}</span>
        </span>
      )}
    </th>
  );
}

function SlotMatrix({ days, leisure, step, today, nowHour }: { days: DayForecast[]; leisure: Leisure; step: number; today: string; nowHour: number }) {
  const hours = slotHours(step);
  const em = (k: MetricKey) => leisure.emphasis.includes(k);
  return (
    <table className="cf-table">
      <thead>
        <tr>
          <th />
          {hours.map((h) => (
            <th key={h}>{slotHead(h, step)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {days.map((d) => {
          const slots = regroup(d.slots, step);
          return (
            <tr key={d.date}>
              <DateCell d={d} leisure={leisure} today={today} withTemp />
              {hours.map((h) => {
                const s = slots.find((x) => x.hour === h);
                if (!s) return <td key={h} className="past" />;
                const past = d.date === today && isPast(h, step, nowHour);
                return (
                  <td key={h} className={past ? "past" : undefined} title={codeInfo(s.code).label}>
                    <span className="cl-icon">{codeIcon(s.code, s.isDay)}</span>
                    <b className="cl-temp">{fmt(s.temp, "°")}</b>
                    <RainLine s={s} em={em("precip")} />
                    <WindLine s={s} em={em("wind") || em("gust")} />
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function DayMatrix({ days, leisure, today }: { days: DayForecast[]; leisure: Leisure; today: string }) {
  const em = (k: MetricKey) => (leisure.emphasis.includes(k) ? "em" : undefined);
  const sunEm = (k: "sunrise" | "sunset") => (leisure.sun === k || leisure.sun === "both" ? "em" : undefined);
  return (
    <table className="cf-table cf-daily">
      <thead>
        <tr>
          <th />
          <th>날씨</th>
          <th>최고/최저</th>
          <th className={em("feels")}>체감</th>
          <th className={em("precip")}>강수</th>
          <th className={em("wind")}>바람</th>
          <th className={em("gust")}>돌풍</th>
          <th className={sunEm("sunrise")}>일출</th>
          <th className={sunEm("sunset")}>일몰</th>
        </tr>
      </thead>
      <tbody>
        {days.map((d) => {
          const s = daySummary(d);
          return (
            <tr key={d.date}>
              <DateCell d={d} leisure={leisure} today={today} withTemp={false} />
              <td className="cf-sky">
                <span className="cl-icon">{codeIcon(d.code)}</span>
                <small>{codeInfo(d.code).label}</small>
              </td>
              <td>
                <b className="v-hi">{fmt(d.tMax, "°")}</b> <span className="v-lo">{fmt(d.tMin, "°")}</span>
              </td>
              <td className={em("feels")}>{fmt(s.feels, "°")}</td>
              <td className={em("precip")}>
                <RainLine s={s} em={false} />
              </td>
              <td className={em("wind")}>
                <WindArrow dir={s.windDir} />
                {fmt(d.windMax)}
              </td>
              <td className={em("gust")}>{fmt(d.gustMax)}</td>
              <td className={sunEm("sunrise")}>{d.sunrise ?? "-"}</td>
              <td className={sunEm("sunset")}>{d.sunset ?? "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * 캡처 전용 화면. 화면 밖에 그려서 이미지로 만든다.
 * 선택한 날을 모두 한 장에 넣되, 화면 한 장 크기를 넘지 않도록
 * 표를 여러 단으로 나누고 크기를 맞춘다.
 */
export function CaptureFrame({ frameRef, ...p }: Props) {
  const [size] = useState(frameSize);
  const [cols, setCols] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const step = stepHours(p.interval);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const fit = fitRef.current;
    if (!body || !fit) return;
    fit.style.transform = "none";
    const aw = body.clientWidth;
    const ah = body.clientHeight;
    const w = fit.offsetWidth;
    const h = fit.offsetHeight;
    if (cols === null) {
      // 한 단으로 그린 크기로 몇 단이 가장 크게 보일지 계산한다
      const n = p.days.length;
      const headH = fit.querySelector("thead")?.getBoundingClientRect().height ?? 0;
      const rowH = (h - headH) / Math.max(1, n);
      let best = 1;
      let bestZoom = Math.min(aw / w, ah / h);
      for (let c = 2; c <= Math.min(4, n); c++) {
        const z = Math.min(aw / (c * w + (c - 1) * GAP), ah / (headH + Math.ceil(n / c) * rowH));
        if (z > bestZoom * 1.08) {
          best = c;
          bestZoom = z;
        }
      }
      if (best > 1) {
        // 측정 결과로 단 수를 정한다 (그리기 전에 한 번만)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCols(best);
        return;
      }
    }
    const z = Math.min(MAX_ZOOM, aw / w, ah / h);
    fit.style.transform = `scale(${z})`;
    fit.style.left = `${Math.max(0, (aw - w * z) / 2)}px`;
    fit.style.top = `${Math.max(0, (ah - h * z) / 2)}px`;
  }, [cols, p.days.length]);

  const n = cols ?? 1;
  const per = Math.ceil(p.days.length / n);
  const chunks = Array.from({ length: n }, (_, i) => p.days.slice(i * per, (i + 1) * per)).filter((c) => c.length);
  const narrow = size.w < 600;

  return (
    <div className="cf-host" aria-hidden>
      <div ref={frameRef} className={`cf${narrow ? " narrow" : ""}`} style={{ width: size.w, height: size.h }}>
        <header className="cf-head">
          <Logo dark size={narrow ? 22 : 28} />
          <div className="cf-title">
            <b>{p.placeName}</b>
            {p.address && p.address !== p.placeName && <span>{p.address}</span>}
          </div>
          <div className="cf-pills">
            <span className="pill mint">
              {p.leisure.emoji} {p.leisure.label}
            </span>
            <span className="pill">{periodLabel(p.period)}</span>
            <span className="pill">{intervalLong(p.interval)}</span>
            {p.elevation != null && <span className="pill">⛰️ 해발 {Math.round(p.elevation).toLocaleString()}m</span>}
          </div>
        </header>
        <div className="cf-body" ref={bodyRef}>
          <div className="cf-fit" ref={fitRef} style={{ gap: GAP }}>
            {chunks.map((c) =>
              p.interval === "day" ? (
                <DayMatrix key={c[0].date} days={c} leisure={p.leisure} today={p.today} />
              ) : (
                <SlotMatrix key={c[0].date} days={c} leisure={p.leisure} step={step} today={p.today} nowHour={p.nowHour} />
              ),
            )}
          </div>
        </div>
        <footer className="cf-foot">
          <span>
            {p.interval === "day" ? "바람·돌풍 하루 최대 m/s" : "바람 풍속/돌풍 m/s"}
            {(p.interval === "6h" || p.interval === "12h") && " · 기온은 낮 칸 최고, 밤 칸 최저"}
          </span>
          <span className="cap-url">tripnal.com</span>
        </footer>
      </div>
    </div>
  );
}
