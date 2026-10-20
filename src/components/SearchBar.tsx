"use client";

import { useEffect, useRef, useState } from "react";
import type { PlaceResult } from "@/lib/geo";
import type { Place } from "@/lib/places";

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/** 우리 장소 목록에서 이름·별칭·지역이 검색어를 포함하는 곳 (이름이 검색어로 시작하면 앞으로) */
export function localMatches(places: Place[], term: string): PlaceResult[] {
  const t = norm(term);
  if (!t) return [];
  return places
    .map((p) => {
      const name = norm(p.name);
      const score = name.startsWith(t) ? 0 : name.includes(t) ? 1 : (p.aliases ?? []).some((a) => norm(a).includes(t)) ? 2 : norm(p.region).includes(t) ? 3 : -1;
      return { p, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map(({ p }) => ({ name: p.name, address: p.region, lat: p.lat, lon: p.lon }));
}

/** 우리 장소 결과를 앞에 두고, 이름이 같고 가까운(약 2km) 카카오 결과는 뺀다 */
export function merge(local: PlaceResult[], remote: PlaceResult[]): PlaceResult[] {
  const near = (a: PlaceResult, b: PlaceResult) => Math.abs(a.lat - b.lat) < 0.02 && Math.abs(a.lon - b.lon) < 0.02;
  return [...local, ...remote.filter((r) => !local.some((l) => norm(l.name) === norm(r.name) && near(l, r)))];
}

interface Props {
  onSelect: (p: { name: string; lat: number; lon: number; address?: string }) => void;
  onLocate: () => void;
  locating: boolean;
}

export function SearchBar({ onSelect, onLocate, locating }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const places = useRef<Place[] | null>(null);
  // 장소 목록은 검색창을 처음 누를 때 불러온다 (첫 화면 용량을 늘리지 않게)
  const loadPlaces = () => {
    if (!places.current) import("@/lib/places").then((m) => (places.current = m.PLACES));
  };

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) return;
    // 우리 장소 목록에서 찾은 결과는 기다림 없이 바로 보여 주고, 카카오 결과가 오면 뒤에 붙인다
    if (places.current) {
      setResults(localMatches(places.current, term));
      setOpen(true);
    }
    setSearching(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setResults(merge(places.current ? localMatches(places.current, term) : [], json.results));
        setError(null);
        setOpen(true);
        setSearching(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
          setSearching(false);
        }
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="search" ref={boxRef}>
      <div className="search-row">
        <input
          className="search-input"
          type="search"
          inputMode="search"
          placeholder="캠핑장, 산, 바다, 주소 검색"
          aria-label="장소 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            loadPlaces();
            if (results.length) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              const r = results[0];
              onSelect({ name: r.name, lat: r.lat, lon: r.lon, address: r.address });
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <button className="icon-btn" onClick={onLocate} aria-label="현재 위치 날씨" title="현재 위치" disabled={locating}>
          <LocateIcon spinning={locating} />
        </button>
      </div>
      {error && <p className="muted">{error}</p>}
      {open && q.trim() && (
        <ul className="search-results" role="listbox">
          {results.length === 0 && <li className="muted" style={{ padding: 12 }}>{searching ? "찾는 중…" : "검색 결과가 없습니다."}</li>}
          {results.map((r) => (
            <li key={`${r.name}-${r.lat}-${r.lon}`}>
              <button
                onClick={() => {
                  onSelect({ name: r.name, lat: r.lat, lon: r.lon, address: r.address });
                  setOpen(false);
                  setQ("");
                }}
              >
                <strong>{r.name}</strong>
                <span className="muted">{r.address}</span>
              </button>
            </li>
          ))}
          {searching && results.length > 0 && <li className="muted search-more">더 찾는 중…</li>}
        </ul>
      )}
    </div>
  );
}

/** 현재 위치 아이콘: 조준점 모양, 가운데 민트 점 */
function LocateIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg className={`locate-ico${spinning ? " spin" : ""}`} width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" fill="var(--mint)" />
    </svg>
  );
}
