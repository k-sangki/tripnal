"use client";

import { useEffect, useRef, useState } from "react";

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
export function AdSlot({ slot, format = "auto", kind }: { slot?: string; format?: string; kind?: AdFitKind }) {
  // 애드센스 광고 단위가 없으면(심사 전 등) 같은 자리에 카카오 애드핏을 보여 준다.
  if (ADS_ENABLED && !(CLIENT && slot) && kind && hasAdFit(kind)) return <AdFitSlot kind={kind} />;
  return <AdSenseSlot slot={slot} format={format} />;
}

function AdSenseSlot({ slot, format }: { slot?: string; format: string }) {
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

/* ---------- 카카오 애드핏 ---------- */

/** 광고 자리 종류. inline 은 본문 가운데(모바일 320x100·PC 728x90), side 는 PC 옆 칸(300x250). */
export type AdFitKind = "inline" | "side";

const ADFIT = {
  mobile: process.env.NEXT_PUBLIC_ADFIT_MOBILE?.trim(), // 320x100
  pc: process.env.NEXT_PUBLIC_ADFIT_PC?.trim(), // 728x90
  side: process.env.NEXT_PUBLIC_ADFIT_SIDE?.trim(), // 300x250
};

function hasAdFit(kind: AdFitKind) {
  return kind === "side" ? !!ADFIT.side : !!(ADFIT.mobile || ADFIT.pc);
}

function pickAdFit(kind: AdFitKind, width: number): { unit: string; w: number; h: number } | null {
  // 폭이 0이면 숨겨진 자리(모바일의 PC 전용 칸 등)라 광고를 부르지 않는다
  if (width <= 0) return null;
  if (kind === "side") return ADFIT.side ? { unit: ADFIT.side, w: 300, h: 250 } : null;
  // 화면이 아니라 광고 자리의 실제 폭으로 고른다(728px 이 안 들어가면 모바일 배너)
  if (width >= 728 && ADFIT.pc) return { unit: ADFIT.pc, w: 728, h: 90 };
  if (ADFIT.mobile) return { unit: ADFIT.mobile, w: 320, h: 100 };
  return null;
}

/**
 * 애드핏 배너. 화면 폭은 브라우저에서만 알 수 있어 마운트 뒤에 광고 단위를 고르고,
 * 페이지 이동(클라이언트 전환) 때도 새로 뜨도록 스크립트를 자리마다 다시 붙인다.
 * .ad-slot 이라 캡처 이미지에는 들어가지 않는다.
 */
function AdFitSlot({ kind }: { kind: AdFitKind }) {
  const box = useRef<HTMLDivElement>(null);
  const [ad, setAd] = useState<{ unit: string; w: number; h: number } | null>(null);

  useEffect(() => setAd(pickAdFit(kind, box.current?.clientWidth ?? 0)), [kind]);

  useEffect(() => {
    const el = box.current;
    if (!ad || !el) return;
    const ins = document.createElement("ins");
    ins.className = "kakao_ad_area";
    ins.style.display = "none";
    ins.setAttribute("data-ad-unit", ad.unit);
    ins.setAttribute("data-ad-width", String(ad.w));
    ins.setAttribute("data-ad-height", String(ad.h));
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://t1.daumcdn.net/kas/static/ba.min.js";
    el.append(ins, script);
    return () => {
      el.replaceChildren();
    };
  }, [ad]);

  return <div ref={box} className="ad-slot adfit" style={ad ? { minHeight: ad.h } : undefined} />;
}
