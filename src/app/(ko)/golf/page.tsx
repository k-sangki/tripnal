import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { GOLF_COURSES, activeGolfRegions, coursesIn } from "@/lib/golf";

export const metadata: Metadata = {
  title: { absolute: "전국 골프장 날씨 · 지역별 CC 이번주·주말 날씨, 비 오는 날 그린피는 아깝잖아요" },
  description: `전국 ${GOLF_COURSES.length}곳 골프장(CC) 날씨를 경기·강원·충청·전라·경상·제주 지역별로. 라운딩 날 티오프 시간대 비·낙뢰·바람(돌풍)·체감온도를 3시간 간격으로 확인하세요.`,
  keywords: ["골프장 날씨", "전국 골프장 날씨", "CC 날씨", "라운딩 날씨", "골프 날씨", "주말 골프장 날씨"],
  alternates: { canonical: "/golf" },
  openGraph: { siteName: "트립날씨", locale: "ko_KR", url: "/golf" },
};

export default function GolfIndex() {
  const regions = activeGolfRegions();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "tripnalc", item: "https://tripnalc.com/" },
      { "@type": "ListItem", position: 2, name: "전국 골프장 날씨", item: "https://tripnalc.com/golf" },
    ],
  };
  return (
    <div className="shell">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>⛳ 전국 골프장 날씨</h1>
      <p className="sub" style={{ margin: "4px 0 12px" }}>
        {GOLF_COURSES.length}곳 · 골프장을 누르면 이번주·주말 날씨를 3시간 간격으로 볼 수 있어요
      </p>
      <nav className="place-links" style={{ marginBottom: 4 }}>
        {regions.map((r) => (
          <a key={r.slug} href={`#${r.slug}`}>
            {r.short} {coursesIn(r).length}
          </a>
        ))}
      </nav>
      {regions.map((r) => (
        <section key={r.slug} id={r.slug} className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">
            <Link href={`/golf/${r.slug}`}>{r.name} 골프장 날씨</Link>
          </h2>
          <nav className="place-links">
            {coursesIn(r).map((p) => (
              <Link key={p.slug} href={`/weather/${p.slug}`}>
                {p.name} 날씨
              </Link>
            ))}
          </nav>
        </section>
      ))}
      <section className="card seo-text" style={{ marginTop: 16 }}>
        <h2>골프장 날씨, 이렇게 보세요</h2>
        <p>
          라운딩은 4~5시간 밖에 있으니 티오프 시각 하나보다 그 뒤 몇 시간의 비·바람이 중요합니다. 골프장 페이지에서 3시간 간격으로 강수량·강수확률,
          낙뢰, 풍속·돌풍, 체감온도를 함께 확인하세요.
        </p>
        <p>
          예보는 ECMWF(유럽)·GFS(미국)·ICON(독일) 세 모델의 가운데 값이며, 골프장 위치의 고도로 기온을 보정합니다. 골프장 위치는 OpenStreetMap(©
          OpenStreetMap contributors) 자료입니다.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
