"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FAV_EVENT, favKey, loadFavs, nextWeekendDay, type FavPlace } from "@/lib/favorites";
import { fetchForecast } from "@/lib/forecastClient";
import { getLeisure } from "@/lib/leisure";
import { weekdayKo } from "@/lib/time";
import { trackEvent } from "@/lib/track";
import { dayVerdict, verdictDay, type VerdictLevel } from "@/lib/verdict";

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/**
 * 홈 맨 위 "내 장소" 띠. 담아 둔 곳마다 다가오는 토요일(주말이면 오늘) 판정을 색 점으로 보여 준다.
 * 담은 곳이 없으면 아무것도 그리지 않는다.
 */
export function MyPlaces({ today, onPick }: { today: string; onPick: (p: FavPlace) => void }) {
  const [favs, setFavs] = useState<FavPlace[]>([]);
  const [levels, setLevels] = useState<Record<string, VerdictLevel | "none">>({});
  const date = nextWeekendDay(today);

  useEffect(() => {
    const sync = () => setFavs(loadFavs());
    sync();
    window.addEventListener(FAV_EVENT, sync);
    return () => window.removeEventListener(FAV_EVENT, sync);
  }, []);

  // 장소마다 예보를 받아 그날 판정만 남긴다 (예보는 엣지에 캐시돼 있다)
  useEffect(() => {
    const ctrl = new AbortController();
    for (const p of favs) {
      const k = `${favKey(p)}|${p.act}`;
      if (levels[k]) continue;
      fetchForecast(p, ctrl.signal)
        .then((f) => {
          const d = f.days.find((x) => x.date === date);
          const l = getLeisure(p.act);
          setLevels((s) => ({ ...s, [k]: d ? dayVerdict(verdictDay(d), l.id, l.group).level : "none" }));
        })
        .catch(() => {});
    }
    return () => ctrl.abort();
    // levels는 이미 받은 곳을 건너뛰는 데만 쓴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favs, date]);

  if (!favs.length) return null;
  return (
    <section className="my-places" aria-label="내 장소">
      <div className="my-places-head">
        <b>⭐ 내 장소</b>
        <span>
          {md(date)}({weekdayKo(date)}) 가도 될까?
        </span>
      </div>
      <div className="my-places-row">
        {favs.map((p) => {
          const lv = levels[`${favKey(p)}|${p.act}`];
          const l = getLeisure(p.act);
          const body = (
            <>
              <i className={`dot ${lv ?? "loading"}`} aria-hidden />
              <span>
                {l.emoji} {p.name}
              </span>
            </>
          );
          const open = () => trackEvent("favorite_open");
          return p.slug ? (
            <Link key={favKey(p)} className="my-place" href={`/weather/${p.slug}?act=${p.act}&vd=${date}`} onClick={open}>
              {body}
            </Link>
          ) : (
            <button
              key={favKey(p)}
              type="button"
              className="my-place"
              onClick={() => {
                open();
                onPick(p);
              }}
            >
              {body}
            </button>
          );
        })}
      </div>
    </section>
  );
}
