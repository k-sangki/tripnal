"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getLeisure, type LeisureId } from "@/lib/leisure";
import { parseInterval, intervalLong, type Interval } from "@/lib/interval";
import { clampPeriod, inPeriod, periodLabel, type Period } from "@/lib/period";
import { kstDate, kstHourKey } from "@/lib/time";
import type { Forecast } from "@/lib/weather/types";
import { AD_SLOTS, AdSlot } from "./AdSlot";
import { CaptureFrame } from "./CaptureFrame";
import { CaptureSheet } from "./CaptureSheet";
import { ForecastTable } from "./ForecastTable";
import { IntervalPicker } from "./IntervalPicker";
import { KakaoMap } from "./KakaoMap";
import { LeisureTabs } from "./LeisureTabs";
import { PeriodPicker } from "./PeriodPicker";
import { SearchBar } from "./SearchBar";

export interface AppPlace {
  name: string;
  lat: number;
  lon: number;
  address?: string;
  elevation?: number;
  /** 장소 페이지(/weather/slug)에서 온 경우 */
  slug?: string;
}

const FORECAST_VERSION = "4";

interface Props {
  initialPlace: AppPlace | null;
  initialForecast?: Forecast | null;
  initialLeisure?: string | null;
  initialFrom?: string | null;
  initialTo?: string | null;
  initialInterval?: string | null;
  /** 장소 페이지의 h1 뒤에 붙는 검색 키워드 (예: "16일 날씨") */
  headingSuffix?: string;
}

const DEFAULT_PLACE: AppPlace = { name: "서울", lat: 37.5665, lon: 126.978, address: "서울특별시" };
const STORE_KEY = "tripnal:last";

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function WeatherApp({ initialPlace, initialForecast, initialLeisure, initialFrom, initialTo, initialInterval, headingSuffix }: Props) {
  const router = useRouter();
  const [today] = useState(() => kstDate());
  const [nowHour] = useState(() => Number(kstHourKey().slice(11, 13)));
  const [place, setPlace] = useState<AppPlace | null>(initialPlace);
  const [leisureId, setLeisureId] = useState<LeisureId>(getLeisure(initialLeisure).id);
  const [period, setPeriod] = useState<Period>(() => clampPeriod(initialFrom, initialTo, today));
  const [interval, setIntervalChoice] = useState<Interval>(parseInterval(initialInterval));
  const [forecast, setForecast] = useState<Forecast | null>(initialForecast ?? null);
  const [loading, setLoading] = useState(!initialForecast);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
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
          const address = await lookupAddress(lat, lon);
          setLocating(false);
          choose({ name: "현재 위치", lat, lon, address });
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
      const q = new URLSearchParams({
        lat: p.lat.toFixed(4),
        lon: p.lon.toFixed(4),
        name: p.name,
        act: leisureId,
        int: interval,
        from: period.from,
        to: period.to,
      });
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
    if (sp.get("int")) setIntervalChoice(parseInterval(sp.get("int")));
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
    // v: 응답 모양이 바뀔 때 올려서 브라우저·엣지에 남은 예전 응답을 쓰지 않게 한다
    const q = new URLSearchParams({ lat: String(place.lat), lon: String(place.lon), v: FORECAST_VERSION });
    if (place.elevation != null) q.set("elev", String(place.elevation));
    fetch(`/api/forecast?${q}`, { signal: ctrl.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "날씨 정보를 가져오지 못했습니다.");
        const f = json as Forecast;
        setForecast({ ...f, days: f.days.map((d) => ({ ...d, tides: d.tides ?? [] })) });
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
    q.set("int", interval);
    q.set("from", period.from);
    q.set("to", period.to);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${q}`);
    if (!place.slug) store()?.setItem(STORE_KEY, JSON.stringify({ place, leisure: leisureId }));
  }, [place, leisureId, interval, period]);

  const days = useMemo(() => (forecast ? forecast.days.filter((d) => inPeriod(d.date, period)) : []), [forecast, period]);

  const shareUrl = typeof window === "undefined" ? "https://tripnal.com" : window.location.href;
  const shareTitle = place ? `${place.name} ${periodLabel(period)} ${leisure.label} 날씨` : "tripnal 날씨";
  const fileName = `tripnal_${place?.name ?? "weather"}_${period.from}_${period.to}_${interval}.png`.replace(/\s+/g, "_");
  const getTarget = useCallback(() => captureRef.current, []);

  return (
    <div className="layout">
      {/* 모바일은 검색 → 지도 → 현재 위치 → 설정 → 예보 → 활동 순서, PC는 왼쪽(검색·지도·설정)과 오른쪽(위치·예보) 2단 */}
      <div className="a-side">
        <div className="o-search">
          <SearchBar onSelect={(p) => choose(p)} onLocate={() => locate(false)} locating={locating} />
        </div>
        {place && (
          <div className={`o-map card map-card${mapOpen ? " open" : ""}`}>
            <button className="map-toggle" aria-expanded={mapOpen} onClick={() => setMapOpen((o) => !o)}>
              <span>🗺️ 지도에서 찾기</span>
              <span className="muted">{mapOpen ? "접기 ▴" : "펼치기 ▾"}</span>
            </button>
            {mapOpen && (
              <KakaoMap
                lat={place.lat}
                lon={place.lon}
                onPick={async (lat, lon) => choose({ name: "지도에서 고른 위치", lat, lon, address: await lookupAddress(lat, lon) })}
              />
            )}
          </div>
        )}
        <div className="o-controls card">
          <PeriodPicker value={period} today={today} onChange={setPeriod} />
          <div style={{ height: 12 }} />
          <IntervalPicker value={interval} onChange={setIntervalChoice} />
        </div>
        <div className="o-ad pc-only">
          <AdSlot slot={AD_SLOTS.side} />
        </div>
      </div>

      <main className="a-main">
        <div className="o-hero">
          {error && <div className="error">{error}</div>}
          <section className="hero">
            <div className="hero-top">
              <span>
                {leisure.emoji} {leisure.groupLabel} 날씨
              </span>
              <span>{intervalLong(interval)} · 최대 16일</span>
            </div>
            <h1 className="hero-name">
              {place?.name ?? "위치 확인 중"}
              {headingSuffix && <span className="h1-suffix"> {headingSuffix}</span>}
            </h1>
            {place?.address && place.address !== place.name && <div className="hero-addr">{place.address}</div>}
            <div className="hero-meta">
              <span className="pill mint">{periodLabel(period)}</span>
              {forecast?.elevation != null && <span className="pill">⛰️ 해발 {Math.round(forecast.elevation).toLocaleString()}m</span>}
            </div>
          </section>
        </div>

        <div className="o-fc">
          {loading && !forecast ? (
            <div className="skeleton" />
          ) : (
            forecast && (
              <div style={{ opacity: loading ? 0.5 : 1 }}>
                <ForecastTable days={days} leisure={leisure} interval={interval} today={today} nowHour={nowHour} />
                <div className="card act-card">
                  <LeisureTabs value={leisureId} onChange={setLeisureId} />
                </div>
                <p className="muted" style={{ marginTop: 12 }}>
                  {(interval === "6h" || interval === "12h") && "기온·체감은 낮 칸은 최고, 밤 칸은 최저 값입니다. "}
                  {forecast.elevation != null &&
                    `기온은 해발 ${Math.round(forecast.elevation)}m 기준으로 보정된 값입니다. 바람은 고도 보정이 되지 않아 높은 산에서는 실제보다 약할 수 있습니다. `}
                  예보 제공: {forecast.source}
                </p>
                <div style={{ height: 12 }} />
                <AdSlot slot={AD_SLOTS.afterSummary} />
              </div>
            )
          )}

          <div style={{ height: 12 }} />
          <AdSlot slot={AD_SLOTS.bottom} />
        </div>
      </main>

      {forecast && !capturing && (
        <button className="fab" onClick={() => setCapturing(true)}>
          <i className="logo-dot" aria-hidden /> 캡처해서 공유
        </button>
      )}
      {capturing && forecast && place && (
        <CaptureFrame
          frameRef={captureRef}
          days={days}
          leisure={leisure}
          interval={interval}
          period={period}
          today={today}
          nowHour={nowHour}
          placeName={place.name}
          address={place.address}
          elevation={forecast.elevation}
          source={forecast.source}
        />
      )}
      {capturing && <CaptureSheet target={getTarget} fileName={fileName} shareTitle={shareTitle} shareUrl={shareUrl} onClose={() => setCapturing(false)} />}
    </div>
  );
}

/** 좌표의 주소. 찾지 못하면 좌표를 그대로 보여준다. */
async function lookupAddress(lat: number, lon: number): Promise<string> {
  try {
    const r = await fetch(`/api/reverse?lat=${lat}&lon=${lon}`).then((x) => x.json());
    if (r.address) return r.address;
  } catch {}
  return `위도 ${lat.toFixed(4)}, 경도 ${lon.toFixed(4)}`;
}
