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
/** 표가 좁아도 머리(장소·기간)가 답답하지 않게 이미지 폭은 화면의 이만큼은 남긴다 */
const MIN_WIDTH = 0.7;

/**
 * 캡처 이미지 폭과 기준 높이: 지금 기기의 화면 한 장.
 * 모바일은 휴대폰 화면 비율, PC는 모니터 해상도(1280~2560px 폭)에 맞춘다. 표를 넣은 뒤 남는 빈 곳은 잘라낸다.
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
 * 화면 한 장 크기를 넘지 않도록 날짜를 몇 줄로 나눠 위아래로 쌓고 크기를 맞춘 뒤, 이미지를 표에 딱 맞게 자른다.
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
    const frame = body.parentElement;
    if (!frame) return;
    // 화면 한 장 크기에서 재고, 마지막에 표에 딱 맞게 줄인다
    frame.style.width = `${size.w}px`;
    frame.style.height = `${size.h}px`;
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
    // 화면 한 장 안에 들어가게 키운 뒤, 남는 위아래(와 양옆) 빈 곳을 잘라 이미지를 표에 딱 맞춘다
    const z = Math.min(MAX_ZOOM, aw / w, ah / h);
    const fw = Math.max(Math.round(size.w * MIN_WIDTH), Math.ceil(frame.offsetWidth - aw + w * z));
    frame.style.width = `${Math.min(size.w, fw)}px`;
    // 폭이 줄어 예보 제공 글자가 로고를 밀어내면 들어갈 때까지 글자를 줄인다
    const src = frame.querySelector<HTMLElement>(".cf-src");
    if (src) {
      src.style.fontSize = "";
      let fs = parseFloat(getComputedStyle(src).fontSize);
      const over = () => {
        const right = src.getBoundingClientRect().right;
        return Array.from(src.querySelectorAll(".cf-src-item")).some((el) => el.getBoundingClientRect().right > right + 0.5);
      };
      src.classList.remove("wrap");
      while (over() && fs > 10) {
        fs -= 1;
        src.style.fontSize = `${fs}px`;
      }
      // 그래도 안 들어가면 기관 이름 괄호 안에서 줄을 바꾼다
      if (over()) src.classList.add("wrap");
    }
    // 폭이 줄면 머리 줄이 늘어날 수 있으니 다시 재서 높이를 정한다
    frame.style.height = `${Math.ceil(frame.offsetHeight - body.clientHeight + h * z)}px`;
    fit.style.transform = `scale(${z})`;
    fit.style.left = `${Math.max(0, (body.clientWidth - w * z) / 2)}px`;
    fit.style.top = "0px";
  }, [rows, p.days.length, size.w, size.h]);

  const n = rows ?? 1;
  const per = Math.ceil(p.days.length / n);
  const chunks = Array.from({ length: n }, (_, i) => p.days.slice(i * per, (i + 1) * per)).filter((c) => c.length);
  const narrow = size.w < 600;

  return (
    <div className="cf-host" aria-hidden>
      <div ref={frameRef} className={`cf${narrow ? " narrow" : ""}`} style={{ width: size.w }}>
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
