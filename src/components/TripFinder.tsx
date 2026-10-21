"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  FLIGHTS,
  PRESETS,
  SEASON_LABEL,
  SORT_LABEL,
  TEMP_LABEL,
  defaultQuery,
  finderTitle,
  monthsLabel,
  runFinder,
  toSearch,
  type FinderQuery,
  type FinderResult,
  type SortBy,
  type TempPref,
} from "@/lib/finder";
import type { FinderRow, SeasonKind } from "@/lib/season";

const PAGE = 40;

/** 해외 여행지 찾기: 달(여러 개)·시즌·지역·비행시간·기온·시차로 고르고, 조건은 주소에 남긴다 */
export function TripFinder({
  rows,
  groups,
  month,
  initial,
  seoulHi,
}: {
  rows: FinderRow[];
  groups: string[];
  /** 페이지 주소의 달 (/overseas/month/{month}) */
  month: number;
  initial: FinderQuery;
  seoulHi: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(initial);
  const [more, setMore] = useState(Boolean(initial.flight || initial.temp || initial.nearTz || initial.sort !== "weather"));
  const [shown, setShown] = useState(PAGE);
  const [copied, setCopied] = useState(false);
  const results = useMemo(() => runFinder(rows, q), [rows, q]);

  const update = (next: FinderQuery) => {
    setQ(next);
    setShown(PAGE);
    router.replace(`${pathname}${toSearch(next, month)}`, { scroll: false });
  };
  const toggle = <T,>(arr: T[], v: T, keepOne = false) => {
    if (arr.includes(v)) return keepOne && arr.length === 1 ? arr : arr.filter((x) => x !== v);
    return [...arr, v];
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: finderTitle(q, results.length), url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // 공유 창을 닫은 경우 등
    }
  };

  return (
    <>
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>{finderTitle(q, results.length)}</h1>
      <p className="muted" style={{ margin: "4px 0 12px" }}>
        여러 달을 고르면 더 많은 달이 맞는 곳이 위로 와요. 간절기·비수기는 날씨는 조금 아쉬워도 보통 항공권·숙소가 저렴한 시기예요.
      </p>

      <nav className="tf-presets" aria-label="빠른 선택">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => update(p.apply(q))}>
            {p.label}
          </button>
        ))}
      </nav>

      <section className="card tf-filters" style={{ marginTop: 12 }}>
        <div className="tf-row">
          <h3>언제</h3>
          <div className="month-chips">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <button
                key={m}
                type="button"
                className={q.months.includes(m) ? "on" : undefined}
                aria-pressed={q.months.includes(m)}
                onClick={() => update({ ...q, months: toggle(q.months, m, true).sort((a, b) => a - b) })}
              >
                {m}월
              </button>
            ))}
          </div>
        </div>
        <div className="tf-row">
          <h3>시즌</h3>
          <div className="tf-chips">
            {(Object.keys(SEASON_LABEL) as SeasonKind[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`tf-season ${s}${q.seasons.includes(s) ? " on" : ""}`}
                aria-pressed={q.seasons.includes(s)}
                onClick={() => update({ ...q, seasons: toggle(q.seasons, s, true) })}
              >
                {SEASON_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="tf-row">
          <h3>어디</h3>
          <div className="tf-chips">
            <button type="button" className={q.groups.length ? undefined : "on"} onClick={() => update({ ...q, groups: [] })}>
              전체
            </button>
            {groups.map((g) => (
              <button
                key={g}
                type="button"
                className={q.groups.includes(g) ? "on" : undefined}
                aria-pressed={q.groups.includes(g)}
                onClick={() => update({ ...q, groups: toggle(q.groups, g) })}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {more && (
          <>
            <div className="tf-row">
              <h3>비행시간</h3>
              <div className="tf-chips">
                <button type="button" className={q.flight ? undefined : "on"} onClick={() => update({ ...q, flight: null })}>
                  상관없음
                </button>
                {FLIGHTS.map((f) => (
                  <button key={f} type="button" className={q.flight === f ? "on" : undefined} onClick={() => update({ ...q, flight: f })}>
                    {f}시간 이내
                  </button>
                ))}
              </div>
            </div>
            <div className="tf-row">
              <h3>기온</h3>
              <div className="tf-chips">
                <button type="button" className={q.temp ? undefined : "on"} onClick={() => update({ ...q, temp: null })}>
                  상관없음
                </button>
                {(Object.keys(TEMP_LABEL) as TempPref[]).map((t) => (
                  <button key={t} type="button" className={q.temp === t ? "on" : undefined} onClick={() => update({ ...q, temp: t })}>
                    {TEMP_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="tf-row">
              <h3>시차</h3>
              <div className="tf-chips">
                <button type="button" className={q.nearTz ? undefined : "on"} onClick={() => update({ ...q, nearTz: false })}>
                  상관없음
                </button>
                <button type="button" className={q.nearTz ? "on" : undefined} onClick={() => update({ ...q, nearTz: true })}>
                  2시간 이내만
                </button>
              </div>
            </div>
            <div className="tf-row">
              <h3>정렬</h3>
              <div className="tf-chips">
                {(Object.keys(SORT_LABEL) as SortBy[]).map((s) => (
                  <button key={s} type="button" className={q.sort === s ? "on" : undefined} onClick={() => update({ ...q, sort: s })}>
                    {SORT_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="tf-foot">
          <button type="button" className="tf-more" onClick={() => setMore(!more)}>
            {more ? "필터 접기 ▴" : "비행시간·기온·시차·정렬 ▾"}
          </button>
          <button type="button" className="tf-reset" onClick={() => update(defaultQuery(month))}>
            초기화
          </button>
        </div>
      </section>

      <div className="tf-head">
        <b>{results.length}곳</b>
        <button type="button" onClick={share}>
          {copied ? "주소를 복사했어요" : "🔗 이 조건 공유"}
        </button>
      </div>

      {results.length ? (
        <>
          <nav className="tf-grid">
            {results.slice(0, shown).map((r) => (
              <ResultCard key={r.row.slug} r={r} total={q.months.length} seoulHi={seoulHi} />
            ))}
          </nav>
          {results.length > shown && (
            <button type="button" className="tf-showmore" onClick={() => setShown(shown + PAGE)}>
              {results.length - shown}곳 더 보기
            </button>
          )}
        </>
      ) : (
        <section className="card" style={{ marginTop: 8 }}>
          <p style={{ margin: 0 }}>조건에 맞는 여행지가 없어요. 달을 더 고르거나 시즌·지역·비행시간 조건을 하나씩 풀어 보세요.</p>
        </section>
      )}
    </>
  );
}

function ResultCard({ r, total, seoulHi }: { r: FinderResult; total: number; seoulHi: number[] }) {
  const { row, matched } = r;
  const first = matched[0];
  const his = matched.map((x) => x.m.hi);
  const los = matched.map((x) => x.m.lo);
  const hi = matched.length === 1 ? `${first.m.hi}°` : `${Math.min(...his)}~${Math.max(...his)}°`;
  const lo = matched.length === 1 ? `${first.m.lo}°` : `${Math.min(...los)}~${Math.max(...los)}°`;
  const kinds = [...new Set(matched.map((x) => x.m.kind))];
  const storm = matched.find((x) => x.m.storm)?.m.storm;
  const reason = matched.find((x) => x.m.kind !== "peak" && x.m.reason)?.m.reason ?? first.m.reason;
  // 같은 달 서울 낮 기온과 비교
  const diff = Math.round(matched.reduce((a, x) => a + x.m.hi - seoulHi[x.month - 1], 0) / matched.length);
  const href = matched.length === 1 ? `/overseas/${row.slug}/${first.month}` : `/overseas/${row.slug}`;
  return (
    <Link href={href} className="tf-card">
      <span className="tf-name">
        <b>{row.name}</b>
        <small>{row.country}</small>
      </span>
      <span className="tf-badges">
        {kinds.map((k) => (
          <i key={k} className={`tf-badge ${k}`}>
            {SEASON_LABEL[k]}
          </i>
        ))}
        {total > 1 && <i className="tf-badge cnt">{matched.length === total ? `${total}개월 모두` : `${monthsLabel(matched.map((x) => x.month))}`}</i>}
      </span>
      <span className="tf-wx">
        <span className="t-hi">{hi}</span> / <span className="t-lo">{lo}</span> · 💧{Math.round(r.avgRain)}mm
      </span>
      {reason && <span className="tf-reason">{reason}</span>}
      <span className="tf-meta">
        ✈️ {Number.isInteger(row.flight) ? row.flight : `${Math.floor(row.flight)}.5`}시간
        {Math.abs(diff) >= 3 && ` · 서울보다 ${Math.abs(diff)}° ${diff > 0 ? "따뜻" : "쌀쌀"}`}
      </span>
      {storm && <span className="tf-storm">⚠️ {storm} 시기</span>}
    </Link>
  );
}
