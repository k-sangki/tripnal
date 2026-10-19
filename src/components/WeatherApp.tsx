"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getLeisure, type LeisureId } from "@/lib/leisure";
import { clampPeriod, inPeriod, type Period } from "@/lib/period";
import { kstDate, kstHourKey } from "@/lib/time";
import type { Forecast } from "@/lib/weather/types";
import { AD_SLOTS, AdSlot } from "./AdSlot";
import { CaptureSheet } from "./CaptureSheet";
import { DayCard } from "./DayCard";
import { KakaoMap } from "./KakaoMap";
import { LeisureTabs } from "./LeisureTabs";
import { Logo } from "./Logo";
import { PeriodPicker } from "./PeriodPicker";
import { SearchBar } from "./SearchBar";
import { SummaryCard, periodLabel } from "./SummaryCard";

export interface AppPlace {
  name: string;
  lat: number;
  lon: number;
  address?: string;
  elevation?: number;
  /** 장소 페이지(/weather/slug)에서 온 경우 */
  slug?: string;
}

interface Props {
  initialPlace: AppPlace | null;
  initialForecast?: Forecast | null;
  initialLeisure?: string | null;
  initialFrom?: string | null;
  initialTo?: string | null;
  /** 장소 페이지의 h1 뒤에 붙는 검색 키워드 (예: "16일 날씨") */
  headingSuffix?: string;
}

const DEFAULT_PLACE: AppPlace = { name: "서울", lat: 37.5665, lon: 126.978, address: "서울특별시" };
const STORE_KEY = "tripnal:last";
const DAY_AD_EVERY = 4;

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function WeatherApp({ initialPlace, initialForecast, initialLeisure, initialFrom, initialTo, headingSuffix }: Props) {
  const router = useRouter();
  const [today] = useState(() => kstDate());
  const [nowHour] = useState(() => Number(kstHourKey().slice(11, 13)));
  const [place, setPlace] = useState<AppPlace | null>(initialPlace);
  const [leisureId, setLeisureId] = useState<LeisureId>(getLeisure(initialLeisure).id);
  const [period, setPeriod] = useState<Period>(() => clampPeriod(initialFrom, initialTo, today));
  const [forecast, setForecast] = useState<Forecast | null>(initialForecast ?? null);
  const [loading, setLoading] = useState(!initialForecast);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const skipFirstFetch = useRef(!!initialForecast);

  const leisure = getLeisure(leisureId);

  const locate = useCallback(
    (silent = false) => {
      if (!navigator.geolocation) {
        if (!silent) setError("이 브라우저는 위치 정보를 지원하지 않습니다.");
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;
          let name = "현재 위치";
          try {
            const r = await fetch(`/api/reverse?lat=${lat}&lon=${lon}`).then((x) => x.json());
            if (r.name) name = r.name;
          } catch {}
          setLocating(false);
          choose({ name, lat, lon, address: "현재 위치" });
        },
        () => {
          setLocating(false);
          if (!silent) setError("위치 권한을 허용하면 현재 위치의 날씨를 볼 수 있습니다.");
          else setPlace((p) => p ?? DEFAULT_PLACE);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
      );
    },
    // choose는 아래에서 정의되며 매 렌더 동일하게 동작
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** 장소 변경. 장소 페이지에서 다른 곳을 고르면 홈으로 이동한다. */
  function choose(p: AppPlace) {
    setError(null);
    if (initialPlace?.slug) {
      const q = new URLSearchParams({ lat: p.lat.toFixed(4), lon: p.lon.toFixed(4), name: p.name, act: leisureId, from: period.from, to: period.to });
      router.push(`/?${q}`);
      return;
    }
    setPlace(p);
  }

  // 장소 페이지는 정적으로 만들어지므로 공유 링크의 레저·기간은 브라우저에서 읽어 적용한다
  useEffect(() => {
    if (!initialPlace?.slug) return;
    const sp = new URLSearchParams(window.location.search);
    // 하이드레이션 이후에만 읽을 수 있는 주소창 값을 한 번 반영한다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sp.get("act")) setLeisureId(getLeisure(sp.get("act")).id);
    if (sp.get("from") && sp.get("to")) setPeriod(clampPeriod(sp.get("from"), sp.get("to"), today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 처음 진입: 위치가 없으면 마지막 장소 → 현재 위치 → 서울 순으로 정한다
  useEffect(() => {
    if (place) return;
    const saved = store()?.getItem(STORE_KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.place) {
          // 브라우저 저장소는 하이드레이션 이후에만 읽을 수 있다
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setPlace(s.place);
          if (s.leisure && !initialLeisure) setLeisureId(getLeisure(s.leisure).id);
          return;
        }
      } catch {}
    }
    locate(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 예보 불러오기
  useEffect(() => {
    if (!place) return;
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const q = new URLSearchParams({ lat: String(place.lat), lon: String(place.lon) });
    if (place.elevation != null) q.set("elev", String(place.elevation));
    fetch(`/api/forecast?${q}`, { signal: ctrl.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "날씨 정보를 가져오지 못했습니다.");
        setForecast(json);
        setError(null);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [place]);

  // 주소창·저장소 동기화 (공유 링크가 같은 화면을 보여주도록)
  useEffect(() => {
    if (!place) return;
    const q = new URLSearchParams();
    if (!place.slug) {
      q.set("lat", place.lat.toFixed(4));
      q.set("lon", place.lon.toFixed(4));
      q.set("name", place.name);
    }
    q.set("act", leisureId);
    q.set("from", period.from);
    q.set("to", period.to);
    window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
    if (!place.slug) store()?.setItem(STORE_KEY, JSON.stringify({ place, leisure: leisureId }));
  }, [place, leisureId, period]);

  const days = useMemo(() => (forecast ? forecast.days.filter((d) => inPeriod(d.date, period)) : []), [forecast, period]);

  const shareUrl = typeof window === "undefined" ? "https://tripnal.com" : window.location.href;
  const shareTitle = place ? `${place.name} ${periodLabel(period)} ${leisure.label} 날씨` : "tripnal 날씨";
  const fileName = `tripnal_${place?.name ?? "weather"}_${period.from}_${period.to}.png`.replace(/\s+/g, "_");
  const getTarget = useCallback(() => captureRef.current, []);

  return (
    <div className="layout">
      <div className="a-controls">
        <SearchBar onSelect={(p) => choose(p)} onLocate={() => locate(false)} locating={locating} />
        <div className="card" style={{ padding: 16, marginTop: 12 }}>
          <LeisureTabs value={leisureId} onChange={setLeisureId} />
          <div style={{ height: 12 }} />
          <PeriodPicker value={period} today={today} onChange={setPeriod} />
        </div>
      </div>
      {place && (
        <div className="a-map card" style={{ padding: 8 }}>
          <KakaoMap lat={place.lat} lon={place.lon} onPick={(lat, lon) => choose({ name: "지도에서 고른 위치", lat, lon })} />
        </div>
      )}
      <div className="a-ad pc-only">
        <AdSlot slot={AD_SLOTS.side} />
      </div>

      <main className="a-main">
        {error && <div className="error">{error}</div>}

        <div ref={captureRef} className="capture">
          <div className="capture-only cap-head">
            <Logo dark size={24} />
            <span className="pill mint">
              {leisure.emoji} {leisure.label} 날씨
            </span>
          </div>

          <section className="hero">
            <div className="hero-top">
              <span>
                {leisure.emoji} {leisure.label} 날씨
              </span>
              <span>3시간 간격 · 최대 16일</span>
            </div>
            <h1 className="hero-name">
              {place?.name ?? "위치 확인 중"}
              {headingSuffix && <span className="h1-suffix"> {headingSuffix}</span>}
            </h1>
            {place?.address && place.address !== place.name && <div style={{ opacity: 0.75, fontSize: 14 }}>{place.address}</div>}
            <div className="hero-meta">
              <span className="pill mint">{periodLabel(period)}</span>
              {forecast?.elevation != null && <span className="pill">⛰️ 해발 {Math.round(forecast.elevation).toLocaleString()}m</span>}
            </div>
          </section>

          <div style={{ height: 12 }} />

          {loading && !forecast ? (
            <div className="skeleton" />
          ) : (
            forecast && (
              <>
                <SummaryCard days={days} leisure={leisure} period={period} />
                <div style={{ height: 12 }} />
                <AdSlot slot={AD_SLOTS.afterSummary} />
                <div style={{ height: 12 }} className="no-capture" />
                <div className="days-grid" style={{ opacity: loading ? 0.5 : 1 }}>
                  {days.map((d, i) => (
                    <FragmentWithAd key={d.date} showAd={i > 0 && i % DAY_AD_EVERY === 0}>
                      <DayCard day={d} leisure={leisure} isToday={d.date === today} nowHour={nowHour} />
                    </FragmentWithAd>
                  ))}
                </div>
                <p className="muted" style={{ marginTop: 12 }}>
                  {forecast.elevation != null && `기온은 해발 ${Math.round(forecast.elevation)}m 기준으로 보정된 값입니다. 바람은 고도 보정이 되지 않아 높은 산에서는 실제보다 약할 수 있습니다. `}
                  예보 제공: {forecast.source}
                </p>
              </>
            )
          )}

          <div className="capture-only cap-foot">
            <span>16일 · 3시간 간격 레저 날씨</span>
            <span className="cap-url">tripnal.com</span>
          </div>
        </div>

        <AdSlot slot={AD_SLOTS.bottom} />
      </main>

      {forecast && !capturing && (
        <button className="fab" onClick={() => setCapturing(true)}>
          <i className="logo-dot" aria-hidden /> 캡처해서 공유
        </button>
      )}
      {capturing && (
        <CaptureSheet target={getTarget} fileName={fileName} shareTitle={shareTitle} shareUrl={shareUrl} onClose={() => setCapturing(false)} />
      )}
    </div>
  );
}

function FragmentWithAd({ showAd, children }: { showAd: boolean; children: React.ReactNode }) {
  return (
    <>
      {showAd && <AdSlot slot={AD_SLOTS.betweenDays} />}
      {children}
    </>
  );
}
