import type { NextConfig } from "next";

/**
 * 배포 버전. 브라우저 코드와 /api/version이 같은 값을 갖고 있어서, 열어 둔 화면이 새 배포를 알아챈다
 * (src/components/UpdateWatcher.tsx). 배포(GitHub Actions)는 커밋 번호, 내 컴퓨터 빌드는 빌드 시각.
 */
const BUILD_ID = process.env.GITHUB_SHA?.slice(0, 12) || `local-${Date.now()}`;

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  // 한국어·외국어 루트 레이아웃이 둘이라 공통 404는 app/global-not-found.tsx가 그린다
  experimental: { globalNotFound: true },
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
