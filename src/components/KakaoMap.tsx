"use client";

import { useEffect, useRef, useState } from "react";

const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

/* 카카오맵 SDK 최소 타입 */
interface KLatLng {
  getLat(): number;
  getLng(): number;
}
interface KMap {
  setCenter(p: KLatLng): void;
  relayout(): void;
}
interface KMarker {
  setPosition(p: KLatLng): void;
}
interface KakaoMaps {
  load(cb: () => void): void;
  LatLng: new (lat: number, lng: number) => KLatLng;
  Map: new (el: HTMLElement, opts: { center: KLatLng; level: number }) => KMap;
  Marker: new (opts: { position: KLatLng; map: KMap }) => KMarker;
  event: { addListener(target: KMap, type: string, cb: (e: { latLng: KLatLng }) => void): void };
}
declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

let loader: Promise<KakaoMaps> | null = null;

function loadSdk(): Promise<KakaoMaps> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`;
    s.async = true;
    s.onload = () => window.kakao!.maps.load(() => resolve(window.kakao!.maps));
    s.onerror = () => {
      loader = null;
      reject(new Error("kakao sdk"));
    };
    document.head.appendChild(s);
  });
  return loader;
}

/** 위치 확인·선택용 지도. 지도를 누르면 그 지점의 날씨로 바뀐다. */
export function KakaoMap({ lat, lon, onPick }: { lat: number; lon: number; onPick: (lat: number, lon: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<{ map: KMap; marker: KMarker; maps: KakaoMaps } | null>(null);
  const pickRef = useRef(onPick);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    pickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!KEY || !el.current) return;
    let cancelled = false;
    loadSdk()
      .then((maps) => {
        if (cancelled || !el.current) return;
        const center = new maps.LatLng(lat, lon);
        const m = new maps.Map(el.current, { center, level: 9 });
        const marker = new maps.Marker({ position: center, map: m });
        maps.event.addListener(m, "click", (e) => pickRef.current(e.latLng.getLat(), e.latLng.getLng()));
        map.current = { map: m, marker, maps };
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
    // 지도는 한 번만 만들고 위치 변경은 아래 effect에서 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const p = new m.maps.LatLng(lat, lon);
    m.marker.setPosition(p);
    m.map.setCenter(p);
  }, [lat, lon]);

  if (!KEY || failed) {
    return (
      <div className="map-box">
        <div className="map-empty">
          {failed ? "지도를 불러오지 못했습니다." : "카카오맵 키를 설정하면 지도에서 위치를 고를 수 있습니다."}
        </div>
      </div>
    );
  }
  return <div className="map-box" ref={el} role="application" aria-label="지도에서 위치 선택" />;
}
