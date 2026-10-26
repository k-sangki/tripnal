import type { Viewport } from "next";
import type { ReactNode } from "react";
import { PullToRefresh } from "@/components/PullToRefresh";

// 시크릿에 줄바꿈이 섞여 들어와도 ads.txt·스크립트 주소가 깨지지 않게 다듬는다
export const ADSENSE = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
// Cloudflare Web Analytics (쿠키 없는 방문 통계)
const CF_BEACON = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN?.trim();

// Google 애널리틱스 4 (측정 ID는 공개 값)
const GA_ID = "G-ETYG3HMZ2M";

// 운영자 기기는 통계에서 뺀다: 주소 뒤에 ?me=1 로 한 번 열면 그 브라우저는 계속 빠지고, ?me=0 으로 되돌린다
function beacon(token: string) {
  return `(function(){try{var q=new URLSearchParams(location.search).get("me");if(q==="1")localStorage.setItem("tripnal-me","1");if(q==="0")localStorage.removeItem("tripnal-me");if(localStorage.getItem("tripnal-me"))return}catch(e){}var s=document.createElement("script");s.defer=true;s.src="https://static.cloudflareinsights.com/beacon.min.js";s.setAttribute("data-cf-beacon",${JSON.stringify(JSON.stringify({ token }))});document.body.appendChild(s)})()`;
}

/** GA4 기본 태그. 통계에서 뺀 운영자 브라우저(?me=1)는 GA4도 끈다 */
function gtagInit(id: string) {
  return `(function(){try{var q=new URLSearchParams(location.search).get("me");if(q==="1")localStorage.setItem("tripnal-me","1");if(q==="0")localStorage.removeItem("tripnal-me");if(localStorage.getItem("tripnal-me"))window["ga-disable-${id}"]=true}catch(e){}})();window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","${id}");`;
}

/** 모든 언어 공통 */
export const SITE_VIEWPORT: Viewport = {
  themeColor: "#0E3B36",
  width: "device-width",
  initialScale: 1,
  // 아이폰 상태바 아래까지 화면을 쓰고, 상태바 자리는 globals.css의 body::before가 단색으로 덮는다
  viewportFit: "cover",
};

/** 한국어·외국어 루트 레이아웃이 같이 쓰는 html 뼈대 (글꼴·광고·통계) */
export function RootDocument({ lang, children }: { lang: string; children: ReactNode }) {
  return (
    <html lang={lang}>
      {/* 루트 레이아웃 두 곳이 같이 쓰는 뼈대라 <head>를 직접 쓴다 (App Router 루트 레이아웃과 같음) */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {ADSENSE && (
          <script
            async
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}`}
          />
        )}
        {/* Google tag (gtag.js) */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
        <script dangerouslySetInnerHTML={{ __html: gtagInit(GA_ID) }} />
      </head>
      <body>
        <PullToRefresh />
        {children}
        {CF_BEACON && (
          <script dangerouslySetInnerHTML={{ __html: beacon(CF_BEACON) }} />
        )}
      </body>
    </html>
  );
}
