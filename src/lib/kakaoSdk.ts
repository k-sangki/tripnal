"use client";

import type { PlaceResult } from "@/lib/geo";

export const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

/* 카카오맵 SDK 최소 타입 */
export interface KLatLng {
  getLat(): number;
  getLng(): number;
}
export interface KMap {
  setCenter(p: KLatLng): void;
  relayout(): void;
}
export interface KMarker {
  setPosition(p: KLatLng): void;
}
interface KOverlay {
  setPosition(p: KLatLng): void;
  setMap(m: KMap | null): void;
}
type KStatus = "OK" | "ZERO_RESULT" | "ERROR";
interface KKeywordDoc {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}
interface KAddressDoc {
  address_name: string;
  x: string;
  y: string;
}
export interface KakaoMaps {
  load(cb: () => void): void;
  LatLng: new (lat: number, lng: number) => KLatLng;
  Map: new (el: HTMLElement, opts: { center: KLatLng; level: number }) => KMap;
  Marker: new (opts: { position: KLatLng; map: KMap }) => KMarker;
  CustomOverlay: new (opts: { position: KLatLng; content: HTMLElement; yAnchor?: number; clickable?: boolean }) => KOverlay;
  event: { addListener(target: KMap, type: string, cb: (e: { latLng: KLatLng }) => void): void };
  services: {
    Status: Record<KStatus, string>;
    Places: new () => { keywordSearch(q: string, cb: (data: KKeywordDoc[], status: string) => void, opts?: { size?: number }): void };
    Geocoder: new () => { addressSearch(q: string, cb: (data: KAddressDoc[], status: string) => void, opts?: { size?: number }): void };
  };
}
declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

let loader: Promise<KakaoMaps> | null = null;

/** 카카오맵 SDK (지도 + 장소 검색 services) */
export function loadSdk(): Promise<KakaoMaps> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    if (!KAKAO_JS_KEY) return reject(new Error("no key"));
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;
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

const inKorea = (lat: number, lon: number) => lat >= 32.8 && lat <= 38.9 && lon >= 124.0 && lon <= 132.0;

/**
 * 브라우저에서 카카오 장소·주소 검색을 바로 부른다 (서버를 거치지 않아 한국에서 빠르다).
 * 결과는 저장하지 않는다(약관). 실패하면 throw → 호출한 쪽이 /api/search로 대신한다.
 */
export async function sdkSearch(q: string): Promise<PlaceResult[]> {
  const maps = await loadSdk();
  const { Places, Geocoder, Status } = maps.services;
  const call = <T,>(run: (cb: (data: T[], status: string) => void) => void, optional: boolean) =>
    new Promise<T[]>((resolve, reject) =>
      run((data, status) => {
        if (status === Status.OK) resolve(data);
        else if (status === Status.ZERO_RESULT || optional) resolve([]);
        else reject(new Error("kakao sdk search"));
      }),
    );
  const [addr, kw] = await Promise.all([
    call<KAddressDoc>((cb) => new Geocoder().addressSearch(q, cb, { size: 5 }), true),
    call<KKeywordDoc>((cb) => new Places().keywordSearch(q, cb, { size: 10 }), false),
  ]);
  const all: PlaceResult[] = [
    ...addr.map((d) => ({ name: d.address_name, address: d.address_name, lat: Number(d.y), lon: Number(d.x) })),
    ...kw.map((d) => ({ name: d.place_name, address: d.road_address_name || d.address_name, lat: Number(d.y), lon: Number(d.x) })),
  ];
  const seen = new Set<string>();
  return all.filter((r) => {
    const k = `${r.name}|${r.lat.toFixed(3)}|${r.lon.toFixed(3)}`;
    if (seen.has(k) || !inKorea(r.lat, r.lon)) return false;
    seen.add(k);
    return true;
  });
}
