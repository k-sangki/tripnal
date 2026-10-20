"use client";

import { useEffect, useRef, useState } from "react";
import { ClimateChart, GuideCard, MonthCards } from "@/components/CityClimate";
import type { GoodMonth, MonthGuide, MonthNormal } from "@/lib/climate";
import { weatherIssues, type WeatherIssue } from "@/lib/climateIssues";
import type { Forecast } from "@/lib/weather/types";

/**
 * 도시 페이지의 월 카드. 누르면 페이지를 옮기지 않고 카드 아래에 그달 평년 날씨와 가이드를 바로 보여 준다
 * (12달 값과 가이드는 서버에서 한 번에 넘겨받는다).
 */
export function CityMonths({
  slug,
  name,
  normals,
  good,
  guides,
  current,
  source,
}: {
  slug: string;
  name: string;
  normals: MonthNormal[];
  good: GoodMonth[];
  guides: (MonthGuide | null)[];
  current: number;
  source: string;
}) {
  const [month, setMonth] = useState(current);
  const detail = useRef<HTMLDivElement>(null);
  const n = normals[month - 1];
  const g = good.find((x) => x.month === month);
  const guide = guides[month - 1];

  const pick = (m: number) => {
    setMonth(m);
    // 카드 아래 내용이 화면 밖이면 보이도록
    requestAnimationFrame(() => {
      const el = detail.current;
      if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <>
      <section className="card" style={{ marginTop: 12 }}>
        <h2 className="card-title">{name} 월별 날씨</h2>
        <p className="muted month-help">
          <span className="good-key" /> 여행하기 좋은 달 · 달을 누르면 아래에 평년 기온과 강수량이 나와요.
        </p>
        <MonthCards slug={slug} normals={normals} good={good} current={current} selected={month} onSelect={pick} />
      </section>

      <div ref={detail} className="month-detail">
        <section className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">
            {name} {month}월 날씨{g && <span className="good-badge">{g.reason ?? "여행하기 좋은 달"}</span>}
          </h2>
          <div className="month-stats light">
            <div>
              <span>평균 최고</span>
              <b className="t-hi">{n.hi.toFixed(1)}°</b>
            </div>
            <div>
              <span>평균 최저</span>
              <b className="t-lo">{n.lo.toFixed(1)}°</b>
            </div>
            <div>
              <span>강수량</span>
              <b>{n.rain}mm</b>
            </div>
            <div>
              <span>습도</span>
              <b>{n.hum}%</b>
            </div>
          </div>
          <h3 className="cc-title">월별 기온·강수량</h3>
          <ClimateChart slug={slug} normals={normals} selected={month} onSelect={setMonth} />
          <p className="muted" style={{ margin: "8px 0 0" }}>
            평년값: {source}(현지 고도 보정)로 계산한 낮 최고·아침 최저 기온 평균과 월 강수량입니다.
          </p>
        </section>
        {guide && <GuideCard title={`${month}월 ${name} 여행 가이드`} guide={guide} />}
      </div>
    </>
  );
}

/** 도시 카드의 "최근 날씨 소식": 16일 예보를 브라우저에서 받아 평년과 비교한다 (페이지는 기다리지 않고 바로 뜬다) */
export function CityIssues({ lat, lon, normals }: { lat: number; lon: number; normals: MonthNormal[] }) {
  const [state, setState] = useState<{ today?: { hi: number; lo: number }; issues: WeatherIssue[] } | "loading" | "error">("loading");

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/forecast?lat=${lat}&lon=${lon}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Forecast>) : Promise.reject(new Error(String(r.status)))))
      .then((f) => {
        const d = f.days[0];
        setState({
          today: d && d.tMax != null && d.tMin != null ? { hi: d.tMax, lo: d.tMin } : undefined,
          issues: weatherIssues(normals, f),
        });
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          console.error(e);
          setState("error");
        }
      });
    return () => ctrl.abort();
  }, [lat, lon, normals]);

  return (
    <div className="city-issues">
      <b>최근 날씨 소식</b>
      {state === "loading" ? (
        <p className="issues-loading">예보를 확인하는 중…</p>
      ) : state === "error" ? (
        <p>예보를 불러오지 못했어요.</p>
      ) : (
        <>
          {state.today && (
            <p>
              오늘 현지 최고 {Math.round(state.today.hi)}°C, 최저 {Math.round(state.today.lo)}°C
            </p>
          )}
          {state.issues.length ? (
            state.issues.map((x) => (
              <p key={x.kind}>
                <span className={`issue-tag ${x.kind}`}>{x.label}</span> {x.text}
              </p>
            ))
          ) : (
            <p>앞으로 16일 동안 평년과 크게 다른 날씨는 없을 전망이에요.</p>
          )}
        </>
      )}
    </div>
  );
}
