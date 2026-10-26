import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
