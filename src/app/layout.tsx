import type { Metadata, Viewport } from "next";
import "./globals.css";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnalc.com";
// 시크릿에 줄바꿈이 섞여 들어와도 ads.txt·스크립트 주소가 깨지지 않게 다듬는다
const ADSENSE = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
// Cloudflare Web Analytics (쿠키 없는 방문 통계)
const CF_BEACON = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN?.trim();

// 운영자 기기는 통계에서 뺀다: 주소 뒤에 ?me=1 로 한 번 열면 그 브라우저는 계속 빠지고, ?me=0 으로 되돌린다
function beacon(token: string) {
  return `(function(){try{var q=new URLSearchParams(location.search).get("me");if(q==="1")localStorage.setItem("tripnal-me","1");if(q==="0")localStorage.removeItem("tripnal-me");if(localStorage.getItem("tripnal-me"))return}catch(e){}var s=document.createElement("script");s.defer=true;s.src="https://static.cloudflareinsights.com/beacon.min.js";s.setAttribute("data-cf-beacon",${JSON.stringify(JSON.stringify({ token }))});document.body.appendChild(s)})()`;
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "tripnalc - 캠핑·낚시·등산 16일 날씨 (3시간 간격)",
    template: "%s | tripnalc",
  },
  description:
    "대한민국 어디든 오늘부터 16일까지 3시간 간격 날씨. 기온·체감온도·비·바람·돌풍·일출·일몰을 캠핑, 낚시, 등산, 자전거, 여행에 맞게 한눈에 보고 캡처해서 공유하세요.",
  applicationName: "tripnalc",
  openGraph: { type: "website", siteName: "tripnalc", locale: "ko_KR" },
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
      </head>
      <body>
        {children}
        {CF_BEACON && (
          <script dangerouslySetInnerHTML={{ __html: beacon(CF_BEACON) }} />
        )}
      </body>
    </html>
  );
}
