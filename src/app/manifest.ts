import type { MetadataRoute } from "next";

/** 휴대폰 홈 화면에 앱처럼 추가할 때 쓰는 정보 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tripnalc - 캠핑·낚시·등산 16일 날씨",
    short_name: "tripnalc",
    description: "놀러 갈 땐, 트립날씨. 대한민국 어디든 16일까지 3시간 간격 레저 날씨",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0E3B36",
    theme_color: "#0E3B36",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
