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
interface KOverlay {
  setPosition(p: KLatLng): void;
  setMap(m: KMap | null): void;
}
interface KakaoMaps {
  load(cb: () => void): void;
  LatLng: new (lat: number, lng: number) => KLatLng;
  Map: new (el: HTMLElement, opts: { center: KLatLng; level: number }) => KMap;
  Marker: new (opts: { position: KLatLng; map: KMap }) => KMarker;
  CustomOverlay: new (opts: { position: KLatLng; content: HTMLElement; yAnchor?: number; clickable?: boolean }) => KOverlay;
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
    // 도메인이 등록되지 않았으면 카카오가 스크립트를 거부해 onerror가 난다
    const fail = (reason: string) => {
      loader = null;
      reject(new Error(reason));
    };
    const timer = setTimeout(() => fail("timeout"), 10000);
    s.onload = () => {
      if (!window.kakao?.maps) return fail("blocked");
      window.kakao.maps.load(() => {
        clearTimeout(timer);
        resolve(window.kakao!.maps);
      });
    };
    s.onerror = () => {
      clearTimeout(timer);
      fail("blocked");
    };
    document.head.appendChild(s);
  });
  return loader;
}

/** 위치 확인·선택용 지도. 지도를 누르면 "이 위치의 예보 보기" 버튼이 뜨고, 누르면 그 지점의 날씨로 바뀐다. */
export function KakaoMap({ lat, lon, onPick }: { lat: number; lon: number; onPick: (lat: number, lon: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<{ map: KMap; marker: KMarker; maps: KakaoMaps } | null>(null);
  const pickRef = useRef(onPick);
  const [failed, setFailed] = useState<string | null>(null);

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
        // 누른 지점에 띄우는 버튼 (지도를 끌어 옮기는 것과 구분)
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "map-pick";
        btn.textContent = "이 위치의 예보 보기";
        const overlay = new maps.CustomOverlay({ position: center, content: btn, yAnchor: 1.3, clickable: true });
        let picked: KLatLng | null = null;
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (!picked) return;
          overlay.setMap(null);
          pickRef.current(picked.getLat(), picked.getLng());
        });
        maps.event.addListener(m, "click", (e) => {
          picked = e.latLng;
          overlay.setPosition(e.latLng);
          overlay.setMap(m);
        });
        map.current = { map: m, marker, maps };
      })
      .catch((e: Error) => setFailed(e.message));
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
          {!KEY
            ? "지도 키(NEXT_PUBLIC_KAKAO_JS_KEY)가 배포에 들어가지 않았습니다."
            : failed === "timeout"
              ? "지도 응답이 늦습니다. 잠시 후 다시 열어 주세요."
              : "카카오가 지도를 거부했습니다. 카카오 앱의 JavaScript SDK 도메인에 이 주소가 등록됐는지, 카카오맵 사용 설정이 켜졌는지 확인해 주세요."}
        </div>
      </div>
    );
  }
  return <div className="map-box" ref={el} role="application" aria-label="지도에서 위치 선택" />;
}
