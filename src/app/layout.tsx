import type { Metadata, Viewport } from "next";
import { PullToRefresh } from "@/components/PullToRefresh";
import "./globals.css";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnalc.com";
// 시크릿에 줄바꿈이 섞여 들어와도 ads.txt·스크립트 주소가 깨지지 않게 다듬는다
const ADSENSE = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
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

const DESCRIPTION = "놀러 갈 땐, 트립날씨. 캠핑날씨·여행날씨·등산·낚시 물때표까지, 이번주 날씨와 주말 날씨를 3시간 간격으로. 비·바람·돌풍을 한눈에 보고 캡처해 공유하세요.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "트립날씨 · 캠핑·등산·낚시·여행 이번주 날씨, 놀러 가도 되는 날 3초 컷",
    // 검색 결과 위에 사이트 이름(트립날씨)이 따로 나오니 제목 뒤에 붙이지 않는다
    template: "%s",
  },
  // 검색 결과·공유 미리보기에 쓰인다. 네이버 권장 80자 이내
  description: DESCRIPTION,
  applicationName: "트립날씨",
  keywords: ["트립날씨", "tripnalc", "캠핑날씨", "캠핑 날씨", "여행날씨", "이번주 날씨", "주말 날씨", "등산 날씨", "낚시 날씨", "물때표", "바다 날씨"],
  openGraph: { type: "website", siteName: "트립날씨", locale: "ko_KR", description: DESCRIPTION },
  formatDetection: { telephone: false },
  // 사이트 소유 확인용 (애드센스, 네이버 서치어드바이저)
  other: {
    ...(ADSENSE ? { "google-adsense-account": ADSENSE } : {}),
    "naver-site-verification": "336d370a97d1326e8a5a2fbb7cc0d3e0086580af",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E3B36",
  width: "device-width",
  initialScale: 1,
  // 아이폰 상태바 아래까지 화면을 쓰고, 상태바 자리는 globals.css의 body::before가 단색으로 덮는다
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
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
