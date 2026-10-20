"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { matchScore } from "@/lib/fuzzy";
import type { Destination } from "@/lib/overseas";

function Card({ d }: { d: Destination }) {
  return (
    <Link href={`/overseas/${d.slug}`} className="ov-card" title={`${d.name} 날씨`}>
      <span className="ov-name">
        <b>{d.name}</b>
        <i>{d.en}</i>
      </span>
      <span className="ov-country">{d.country}</span>
    </Link>
  );
}

/** 해외 여행지 목록: 맨 위 검색창(표기가 조금 달라도 찾음) + 묶음별 카드 격자 */
export function OverseasList({ destinations, groups }: { destinations: Destination[]; groups: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const found = useMemo(() => {
    if (!q.trim()) return null;
    return destinations
      .map((d) => ({ d, s: matchScore(q, [d.name, d.en, d.country, ...(d.aliases ?? [])]) }))
      .filter((x) => x.s != null)
      .sort((a, b) => a.s! - b.s!)
      .map((x) => x.d);
  }, [q, destinations]);

  return (
    <>
      <input
        className="search-input ov-search"
        type="search"
        inputMode="search"
        placeholder="도시·나라 검색 (예: 호치민, 푸켓, 파리)"
        aria-label="해외 여행지 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && found?.[0]) router.push(`/overseas/${found[0].slug}`);
        }}
      />
      {found ? (
        <section className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">검색 결과 {found.length}곳</h2>
          {found.length ? (
            <nav className="ov-grid">
              {found.map((d) => (
                <Card key={d.slug} d={d} />
              ))}
            </nav>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              찾는 여행지가 없어요. 다른 이름으로 검색해 보세요.
            </p>
          )}
        </section>
      ) : (
        groups.map((g) => (
          <section key={g} className="card" style={{ marginTop: 12 }}>
            <h2 className="card-title">{g}</h2>
            <nav className="ov-grid">
              {destinations
                .filter((d) => d.group === g)
                .map((d) => (
                  <Card key={d.slug} d={d} />
                ))}
            </nav>
          </section>
        ))
      )}
    </>
  );
}
