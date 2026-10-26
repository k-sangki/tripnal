import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GolfCards } from "@/components/GolfFinder";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { activeGolfRegions, centerOf, coursesIn, getGolfRegion } from "@/lib/golf";
import { placeSummary } from "@/lib/seo";
import { getForecast } from "@/lib/weather";
import type { Forecast } from "@/lib/weather/types";

/** 시·도 가운데 지점의 예보로 요약 문장을 쓴다. 그린 페이지는 worker.ts가 엣지 캐시에 보관한다 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/golf/[region]">): Promise<Metadata> {
  const r = getGolfRegion((await params).region);
  if (!r) return {};
  const n = coursesIn(r).length;
  if (!n) return {};
  const title = `${r.name} 골프장 날씨 · ${r.short} CC ${n}곳 이번주·주말 날씨, 비 피해서 칠 곳 찾기`;
  const description = `${r.name} 골프장 ${n}곳의 이번주·주말 날씨. ${coursesIn(r)
    .slice(0, 4)
    .map((p) => p.name)
    .join("·")} 등 라운딩 날 비·낙뢰·바람(돌풍)·체감온도를 3시간 간격으로 비교하세요.`;
  const url = `/golf/${r.slug}`;
  return {
    title: { absolute: title },
    description,
    keywords: [`${r.name} 골프장 날씨`, `${r.short} 골프장 날씨`, `${r.short} CC 날씨`, "골프장 날씨", "라운딩 날씨"],
    alternates: { canonical: url },
    openGraph: { siteName: "트립날씨", locale: "ko_KR", title, description, url },
  };
}

export default async function GolfRegionPage({ params }: PageProps<"/golf/[region]">) {
  const r = getGolfRegion((await params).region);
  const list = r ? coursesIn(r) : [];
  if (!r || !list.length) notFound();

  let forecast: Forecast | null = null;
  try {
    const c = centerOf(list);
    forecast = await getForecast(c.lat, c.lon);
  } catch (e) {
    console.error(e);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: `${r.name} 골프장`,
        itemListElement: list.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: `https://tripnalc.com/weather/${p.slug}` })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "tripnalc", item: "https://tripnalc.com/" },
          { "@type": "ListItem", position: 2, name: "전국 골프장 날씨", item: "https://tripnalc.com/golf" },
          { "@type": "ListItem", position: 3, name: `${r.name} 골프장 날씨`, item: `https://tripnalc.com/golf/${r.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="shell">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>⛳ {r.name} 골프장 날씨</h1>
      <p className="sub" style={{ margin: "4px 0 12px" }}>
        {list.length}곳 · 골프장을 누르면 이번주·주말 날씨를 3시간 간격으로 볼 수 있어요
      </p>
      <section className="card">
        <GolfCards courses={list} />
      </section>
      <section className="card seo-text" style={{ marginTop: 16 }}>
        <h2>{r.name} 골프장 날씨 요약</h2>
        {forecast ? (
          placeSummary({ name: `${r.name} 골프장`, leisure: "golf" }, forecast).map((line) => <p key={line}>{line}</p>)
        ) : (
          <p>예보를 불러오는 중입니다.</p>
        )}
        <p>
          {r.name} 골프장들의 가운데 지점 기준 요약이며, 산 쪽 골프장은 고도에 따라 기온이 더 낮을 수 있습니다. 정확한 라운딩 날씨는 골프장별 페이지에서
          확인하세요.
        </p>
      </section>
      <section className="card" style={{ marginTop: 12 }}>
        <h2 className="card-title">다른 지역 골프장 날씨</h2>
        <nav className="place-links">
          {activeGolfRegions()
            .filter((o) => o.slug !== r.slug)
            .map((o) => (
              <Link key={o.slug} href={`/golf/${o.slug}`}>
                {o.name} 골프장 날씨
              </Link>
            ))}
          <Link href="/golf">전국 골프장 날씨</Link>
        </nav>
      </section>
      <SiteFooter />
    </div>
  );
}
