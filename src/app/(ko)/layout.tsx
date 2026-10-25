import type { Metadata } from "next";
import { ADSENSE, RootDocument, SITE_VIEWPORT } from "@/components/RootDocument";
import "../globals.css";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tripnalc.com";
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

export const viewport = SITE_VIEWPORT;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <RootDocument lang="ko">{children}</RootDocument>;
}
