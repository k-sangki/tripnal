"use client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type ShareMethod = "kakao" | "image" | "image_copy" | "save" | "link" | "copy" | "naver";

/**
 * 공유 버튼 누름을 GA4 추천 이벤트 share 로 남긴다.
 * ?me=1 로 연 브라우저는 ga-disable 이라 gtag가 아무것도 보내지 않는다.
 */
export function trackShare(method: ShareMethod, contentType: string) {
  try {
    window.gtag?.("event", "share", { method, content_type: contentType, item_id: location.pathname });
  } catch {
    // 통계가 막혀 있어도 공유는 그대로
  }
}

/** 그 밖의 참여 이벤트 (내 장소 추가, 가까운 대안 누름 등) */
export function trackEvent(name: "favorite_add" | "favorite_remove" | "favorite_open" | "alt_place_click", params: Record<string, string> = {}) {
  try {
    window.gtag?.("event", name, { item_id: location.pathname, ...params });
  } catch {
    // 통계가 막혀 있어도 동작은 그대로
  }
}
