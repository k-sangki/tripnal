import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { WeatherApp } from "@/components/WeatherApp";
import { golfRegionOf, nearbyCourses } from "@/lib/golf";
import { getLeisure } from "@/lib/leisure";
import { PLACES, getPlace } from "@/lib/places";
import { placeDescription, placeSchemaType, placeSummary, placeTitle } from "@/lib/seo";
import { getForecast } from "@/lib/weather";
import type { Forecast } from "@/lib/weather/types";

/** 요청마다 그린다. 그린 페이지는 worker.ts가 엣지 캐시에 15분, 계산한 예보는 원자료 판이 바뀔 때까지 보관한다. */
export const dynamic = "force-dynamic";

/** 미리보기 이미지 주소. 공유 링크에 붙은 레저·기간을 그대로 넘긴다 */
function ogImage(slug: string, sp: Record<string, string | string[] | undefined>) {
  const q = new URLSearchParams({ slug });
  for (const k of ["act", "from", "to"]) {
    const v = sp[k];
    if (typeof v === "string") q.set(k, v);
  }
  return `/api/og?${q}`;
}

export async function generateMetadata({ params, searchParams }: PageProps<"/weather/[slug]">): Promise<Metadata> {
  const place = getPlace((await params).slug);
  if (!place) return {};
  const title = placeTitle(place);
  const description = placeDescription(place);
  const url = `/weather/${place.slug}`;
  const image = ogImage(place.slug, await searchParams);
  return {
    // 구글 결과 위에 사이트 이름(트립날씨)이 따로 나오니 뒤에 "| 트립날씨"를 붙이지 않는다
    title: { absolute: title },
    description,
    keywords: [
      `${place.name} 날씨`,
      `${place.name} 이번주 날씨`,
      `${place.name} 주말 날씨`,
      ...(place.leisure === "fishing" ? [`${place.name} 물때표`, `${place.name} 바다 날씨`] : []),
      ...(place.leisure === "golf" ? [`${place.name} 골프장 날씨`, `${place.name} 라운딩 날씨`, "골프장 날씨"] : []),
      `${place.name} ${getLeisure(place.leisure).label} 날씨`,
      ...(place.aliases ?? []).map((a) => `${a} 날씨`),
    ],
    alternates: { canonical: url },
    openGraph: { siteName: "트립날씨", locale: "ko_KR", title, description, url, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PlacePage({ params }: PageProps<"/weather/[slug]">) {
  const place = getPlace((await params).slug);
  if (!place) notFound();

  let forecast: Forecast | null = null;
  try {
    forecast = await getForecast(place.lat, place.lon, place.elevation);
  } catch (e) {
    console.error(e);
  }

  const leisure = getLeisure(place.leisure);
  const golf = place.leisure === "golf";
  const golfRegion = golf ? golfRegionOf(place) : undefined;
  // 골프장은 가까운 곳끼리 묶어 보여준다 (같은 날 비교해서 고르니까)
  const related = golf ? nearbyCourses(place) : PLACES.filter((p) => p.slug !== place.slug && p.leisure === place.leisure).slice(0, 8);
  const crumbs = golf
    ? [
        { name: "전국 골프장 날씨", item: "https://tripnalc.com/golf" },
        ...(golfRegion ? [{ name: `${golfRegion.name} 골프장 날씨`, item: `https://tripnalc.com/golf/${golfRegion.slug}` }] : []),
      ]
    : [{ name: "장소별 날씨", item: "https://tripnalc.com/weather" }];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": placeSchemaType(place),
        name: place.name,
        address: place.region,
        geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lon, ...(place.elevation ? { elevation: place.elevation } : {}) },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "tripnalc", item: "https://tripnalc.com/" },
          ...crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 2, ...c })),
          { "@type": "ListItem", position: crumbs.length + 2, name: `${place.name} 날씨`, item: `https://tripnalc.com/weather/${place.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="shell">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <WeatherApp
        initialPlace={{ name: place.name, lat: place.lat, lon: place.lon, address: place.region, elevation: place.elevation, slug: place.slug }}
        initialForecast={forecast}
        initialLeisure={place.leisure}
        headingSuffix="16일 날씨"
      />

      <section className="card seo-text" style={{ marginTop: 16 }}>
        <h2>
          {place.name} {leisure.label} 날씨 요약
        </h2>
        {forecast ? placeSummary(place, forecast).map((line) => <p key={line}>{line}</p>) : <p>예보를 불러오는 중입니다.</p>}
        <p>
          {place.name}({place.region})의 날씨를 오늘부터 최대 16일까지 3시간 간격으로 보여드립니다. 기간을 직접 고르면 1박 2일, 2박 3일처럼 원하는
          날짜만 볼 수 있고, 캡처 버튼으로 이미지를 저장해 일행과 공유할 수 있습니다.
        </p>
      </section>

      {related.length > 0 && (
        <section className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">{golf ? "근처 골프장 날씨" : `다른 ${leisure.label} 장소 날씨`}</h2>
          <nav className="place-links">
            {related.map((p) => (
              <Link key={p.slug} href={`/weather/${p.slug}`}>
                {p.name} 날씨
              </Link>
            ))}
            {golf && (
              <Link href={golfRegion ? `/golf/${golfRegion.slug}` : "/golf"}>{golfRegion ? `${golfRegion.name} 골프장 날씨 전체` : "전국 골프장 날씨"}</Link>
            )}
          </nav>
        </section>
      )}
      <SiteFooter />
    </div>
  );
}
