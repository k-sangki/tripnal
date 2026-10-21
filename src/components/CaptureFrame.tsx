"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Leisure } from "@/lib/leisure";
import { intervalLong, type Interval } from "@/lib/interval";
import { periodLabel, type Period } from "@/lib/period";
import type { DayForecast } from "@/lib/weather/types";
import { ForecastTable } from "./ForecastTable";
import { Logo } from "./Logo";
import { SLOGAN_C } from "@/lib/brand";

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

/** 캡처 우하단 "예보 제공"에 쓰는 기관 이름 (괄호 안은 흐리게) */
const SOURCE_NAMES: Record<string, string> = {
  ECMWF: "유럽 중기 기상예보 센터",
  GFS: "미국 NOAA·NCEP",
  ICON: "독일기상청 DWD",
};
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

/**
 * 캡처 전용 화면. 화면 밖에 그려서 이미지로 만든다.
 * 화면에서 보는 표와 같은 모양(날짜는 가로, 항목은 세로)으로 선택한 날을 모두 넣되,
 * 화면 한 장 크기를 넘지 않도록 날짜를 몇 줄로 나눠 위아래로 쌓고 크기를 맞춘다.
 */
export function CaptureFrame({ frameRef, ...p }: Props) {
  const [size] = useState(frameSize);
  const [rows, setRows] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const fit = fitRef.current;
    if (!body || !fit) return;
    fit.style.transform = "none";
    const aw = body.clientWidth;
    const ah = body.clientHeight;
    const w = fit.offsetWidth;
    const h = fit.offsetHeight;
    if (rows === null) {
      // 한 줄로 그린 크기로, 몇 줄로 나눠 쌓아야 가장 크게 보일지 계산한다
      const n = p.days.length;
      const lbl = fit.querySelector<HTMLElement>("th.lbl")?.offsetWidth ?? 0;
      const perDay = (w - lbl) / Math.max(1, n);
      let best = 1;
      let bestZoom = Math.min(aw / w, ah / h);
      for (let r = 2; r <= n; r++) {
        const z = Math.min(aw / (lbl + perDay * Math.ceil(n / r)), ah / (r * h + (r - 1) * GAP));
        if (z > bestZoom * 1.08) {
          best = r;
          bestZoom = z;
        }
      }
      if (best > 1) {
        // 측정 결과로 줄 수를 정한다 (그리기 전에 한 번만)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRows(best);
        return;
      }
    }
    const z = Math.min(MAX_ZOOM, aw / w, ah / h);
    fit.style.transform = `scale(${z})`;
    fit.style.left = `${Math.max(0, (aw - w * z) / 2)}px`;
    fit.style.top = `${Math.max(0, (ah - h * z) / 2)}px`;
  }, [rows, p.days.length]);

  const n = rows ?? 1;
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
              {p.leisure.emoji} {p.leisure.groupLabel}
            </span>
            <span className="pill">{periodLabel(p.period)}</span>
            <span className="pill">{intervalLong(p.interval)}</span>
            {p.elevation != null && <span className="pill">⛰️ 해발 {Math.round(p.elevation).toLocaleString()}m</span>}
          </div>
        </header>
        <div className="cf-body" ref={bodyRef}>
          <div className="cf-fit" ref={fitRef} style={{ gap: GAP }}>
            {chunks.map((c) => (
              <ForecastTable key={c[0].date} days={c} leisure={p.leisure} interval={p.interval} today={p.today} nowHour={p.nowHour} capture />
            ))}
          </div>
        </div>
        <footer className="cf-foot">
          {p.source && (
            <span className="cf-src">
              예보 제공 :{" "}
              {p.source.split("·").map((s, i) => (
                <span key={s}>
                  {i > 0 && " · "}
                  {/* 한 기관 이름이 줄 중간에서 끊기지 않게 */}
                  <span className="cf-src-item">
                    {s}
                    {SOURCE_NAMES[s] && <span className="cf-src-sub"> ({SOURCE_NAMES[s]})</span>}
                  </span>
                </span>
              ))}
            </span>
          )}
          <span className="cap-brand">
            <span className="cap-slogan">{SLOGAN_C}</span>
            <span className="cap-url">tripnalc.com</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
