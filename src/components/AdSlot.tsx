"use client";

import { useEffect, useRef } from "react";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
/**
 * 광고 자리 표시 여부. Open-Meteo 무료 API는 광고 사이트에서 쓸 수 없어서 꺼 두었다가,
 * 예보를 ECMWF·GFS·ICON 직접 수집으로 바꾼 뒤 켰다 (2026-10-20 SK 결정).
 */
export const ADS_ENABLED = true;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * 애드센스 수동 광고 슬롯. 캡처 이미지에는 포함되지 않는다(.ad-slot 은 캡처 시 숨김).
 * slot 값은 애드센스에서 만든 광고 단위 ID. 클라이언트 ID가 없으면 개발 중에만 자리 표시를 보여준다.
 */
export function AdSlot({ slot, format = "auto" }: { slot?: string; format?: string }) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!ADS_ENABLED || !CLIENT || !slot || !ref.current || ref.current.dataset.loaded) return;
    ref.current.dataset.loaded = "1";
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 광고 차단기 등으로 실패해도 화면에는 영향 없음
    }
  }, [slot]);

  if (!ADS_ENABLED || !CLIENT || !slot) {
    if (process.env.NODE_ENV === "development") return <div className="ad-slot dev">광고 영역</div>;
    return null;
  }
  return (
    <ins
      ref={ref}
      className="adsbygoogle ad-slot"
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}

export const AD_SLOTS = {
  afterSummary: process.env.NEXT_PUBLIC_AD_SLOT_SUMMARY?.trim(),
  betweenDays: process.env.NEXT_PUBLIC_AD_SLOT_DAYS?.trim(),
  side: process.env.NEXT_PUBLIC_AD_SLOT_SIDE?.trim(),
  bottom: process.env.NEXT_PUBLIC_AD_SLOT_BOTTOM?.trim(),
};
