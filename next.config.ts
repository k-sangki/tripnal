import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 예전 주소(tripnal.com)와 www는 tripnalc.com 같은 경로로 영구 이동시킨다
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(www\\.)?tripnal\\.com" }],
        destination: "https://tripnalc.com/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www\\.tripnalc\\.com" }],
        destination: "https://tripnalc.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
