"use client";

import { useEffect, useRef, useState } from "react";
import type { PlaceResult } from "@/lib/geo";

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
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setResults(json.results);
        setError(null);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }, 250);
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
          onFocus={() => results.length && setOpen(true)}
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
          {results.length === 0 && <li className="muted" style={{ padding: 12 }}>검색 결과가 없습니다.</li>}
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
