"use client";

import { KAKAO_JS_KEY } from "./kakaoSdk";

/* 카카오 JavaScript SDK(공유용) 최소 타입. 지도 SDK의 window.kakao 와는 다른 window.Kakao */
interface KakaoJs {
  isInitialized(): boolean;
  init(key: string): void;
  Share: { sendScrap(opts: { requestUrl: string }): void };
}
declare global {
  interface Window {
    Kakao?: KakaoJs;
  }
}

const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

let loader: Promise<KakaoJs> | null = null;

/** 카카오톡 공유 SDK. 키가 없거나 스크립트가 막히면 reject → 카톡 버튼을 숨긴다 */
export function loadKakaoShare(): Promise<KakaoJs> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    if (!KAKAO_JS_KEY) return reject(new Error("no key"));
    const ready = () => {
      const K = window.Kakao;
      if (!K?.Share) return reject(new Error("blocked"));
      if (!K.isInitialized()) K.init(KAKAO_JS_KEY!);
      resolve(K);
    };
    if (window.Kakao) return ready();
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = ready;
    s.onerror = () => reject(new Error("blocked"));
    document.head.appendChild(s);
  });
  loader.catch(() => (loader = null));
  return loader;
}

/**
 * 카톡으로 한 장짜리 카드(미리보기 그림·제목·설명·버튼)를 보낸다.
 * 카드 내용은 카카오가 주소의 og 태그(/api/og 그림)를 읽어 만든다.
 * 카카오 개발자 콘솔에 tripnalc.com 이 사이트 도메인으로 등록돼 있어야 한다.
 */
export function sendKakao(K: KakaoJs, url: string) {
  K.Share.sendScrap({ requestUrl: url });
}
