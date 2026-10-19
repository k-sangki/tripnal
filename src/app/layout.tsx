import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnal.com";
const ADSENSE = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "tripnal - 캠핑·낚시·등산 16일 날씨 (3시간 간격)",
    template: "%s | tripnal",
  },
  description:
    "대한민국 어디든 오늘부터 16일까지 3시간 간격 날씨. 기온·체감온도·비·바람·돌풍·일출·일몰을 캠핑, 낚시, 등산, 자전거, 여행에 맞게 한눈에 보고 캡처해서 공유하세요.",
  applicationName: "tripnal",
  openGraph: { type: "website", siteName: "tripnal", locale: "ko_KR" },
  formatDetection: { telephone: false },
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
      </head>
      <body>
        {children}
        {ADSENSE && (
          <Script
            id="adsense"
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}`}
          />
        )}
      </body>
    </html>
  );
}
