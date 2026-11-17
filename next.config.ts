import type { NextConfig } from "next";
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots";

/**
 * 배포 버전. 브라우저 코드와 /api/version이 같은 값을 갖고 있어서, 열어 둔 화면이 새 배포를 알아챈다
 * (src/components/UpdateWatcher.tsx). 배포(GitHub Actions)는 커밋 번호, 내 컴퓨터 빌드는 빌드 시각.
 */
const BUILD_ID = process.env.GITHUB_SHA?.slice(0, 12) || `local-${Date.now()}`;

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  // 한국어·외국어 루트 레이아웃이 둘이라 공통 404는 app/global-not-found.tsx가 그린다
  experimental: { globalNotFound: true },
  // 검색 로봇에는 제목·설명·canonical을 <head> 안에 다 넣은 뒤 보낸다.
  // Next는 Googlebot이 JS를 실행한다고 보고 메타데이터를 나중에 <body>로 흘려보내는데(스트리밍),
  // 예보 계산이 느린 장소 페이지와 홈은 Googlebot이 받은 HTML의 <head>에 제목·설명·canonical이 비어 있었다(2026-11-17 점검).
  // 구글이 화면을 그려 보기 전(렌더링 대기)에는 제목 없는 페이지로 보이므로, 기본 목록에 Googlebot·Daum·네이버를 더한다.
  htmlLimitedBots: new RegExp(`${HTML_LIMITED_BOT_UA_RE.source}|Googlebot|Daum|NaverBot`, "i"),
  // 예전 주소(tripnal.com)와 www는 tripnalc.com 같은 경로로 영구 이동(301, 네이버 로봇이 확실히 따라가는 코드)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(www\\.)?tripnal\\.com" }],
        destination: "https://tripnalc.com/:path*",
        statusCode: 301,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www\\.tripnalc\\.com" }],
        destination: "https://tripnalc.com/:path*",
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
