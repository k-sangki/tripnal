"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { matchScore } from "@/lib/fuzzy";

export interface GolfRow {
  slug: string;
  name: string;
  /** "경기 용인시" */
  region: string;
  aliases?: string[];
}

export interface GolfRegionRow {
  slug: string;
  short: string;
  name: string;
  courses: GolfRow[];
}

/** 시·도를 뺀 시·군·구 ("경기 용인시" → "용인시") */
const city = (region: string) => region.split(" ").slice(1).join(" ") || region;

export function GolfCards({ courses }: { courses: GolfRow[] }) {
  return (
    <nav className="ov-grid">
      {courses.map((c) => (
        <Link key={c.slug} href={`/weather/${c.slug}`} className="ov-card" title={`${c.name} 날씨`}>
          <span className="ov-name">
            <b>{c.name}</b>
          </span>
          <span className="ov-country">{city(c.region)}</span>
        </Link>
      ))}
    </nav>
  );
}

/** 전국 골프장 날씨(/golf): 맨 위 이름·지역 검색, 시·도 칩으로 거르고, 시·도별 카드 격자 */
export function GolfFinder({ regions }: { regions: GolfRegionRow[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const all = useMemo(() => regions.flatMap((r) => r.courses), [regions]);
  const found = useMemo(() => {
    if (!text.trim()) return null;
    return all
      .map((c) => ({ c, s: matchScore(text, [c.name, c.region, ...(c.aliases ?? [])]) }))
      .filter((x) => x.s != null)
      .sort((a, b) => a.s! - b.s!)
      .map((x) => x.c);
  }, [text, all]);
  const shown = pick ? regions.filter((r) => r.slug === pick) : regions;

  return (
    <>
      <input
        className="search-input ov-search"
        type="search"
        inputMode="search"
        placeholder="골프장·지역 검색 (예: 남서울, 용인, 제주)"
        aria-label="골프장 검색"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && found?.[0]) router.push(`/weather/${found[0].slug}`);
        }}
      />

      {found ? (
        <section className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">검색 결과 {found.length}곳</h2>
          {found.length ? (
            <GolfCards courses={found} />
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              찾는 골프장이 없어요. 다른 이름이나 지역으로 검색해 보세요.
            </p>
          )}
        </section>
      ) : (
        <>
          <nav className="tf-chips" aria-label="지역" style={{ marginTop: 12 }}>
            <button type="button" className={pick ? undefined : "on"} onClick={() => setPick(null)}>
              전체 {all.length}
            </button>
            {regions.map((r) => (
              <button key={r.slug} type="button" className={pick === r.slug ? "on" : undefined} onClick={() => setPick(pick === r.slug ? null : r.slug)}>
                {r.short} {r.courses.length}
              </button>
            ))}
          </nav>
          {shown.map((r) => (
            <section key={r.slug} id={r.slug} className="card" style={{ marginTop: 12 }}>
              <h2 className="card-title">
                <Link href={`/golf/${r.slug}`}>{r.name} 골프장 날씨</Link> <span className="muted">{r.courses.length}곳</span>
              </h2>
              <GolfCards courses={r.courses} />
            </section>
          ))}
        </>
      )}
    </>
  );
}
