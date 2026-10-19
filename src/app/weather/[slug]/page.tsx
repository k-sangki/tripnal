import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { WeatherApp } from "@/components/WeatherApp";
import { getLeisure } from "@/lib/leisure";
import { PLACES, getPlace } from "@/lib/places";
import { placeDescription, placeSummary, placeTitle } from "@/lib/seo";
import { getForecast } from "@/lib/weather";
import type { Forecast } from "@/lib/weather/types";

/** 요청마다 그린다. 예보 자체는 엣지 캐시에 30분 보관된다(src/lib/cache.ts). */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/weather/[slug]">): Promise<Metadata> {
  const place = getPlace((await params).slug);
  if (!place) return {};
  const title = placeTitle(place);
  const description = placeDescription(place);
  const url = `/weather/${place.slug}`;
  return {
    title,
    description,
    keywords: [
      `${place.name} 날씨`,
      `${place.name} 16일 날씨`,
      `${place.name} 주말 날씨`,
      `${place.name} ${getLeisure(place.leisure).label} 날씨`,
      ...(place.aliases ?? []).map((a) => `${a} 날씨`),
    ],
    alternates: { canonical: url },
    openGraph: { title, description, url },
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
  const related = PLACES.filter((p) => p.slug !== place.slug && p.leisure === place.leisure).slice(0, 8);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Place",
        name: place.name,
        address: place.region,
        geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lon, ...(place.elevation ? { elevation: place.elevation } : {}) },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "tripnal", item: "https://tripnal.com/" },
          { "@type": "ListItem", position: 2, name: "장소별 날씨", item: "https://tripnal.com/weather" },
          { "@type": "ListItem", position: 3, name: `${place.name} 날씨`, item: `https://tripnal.com/weather/${place.slug}` },
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
          <h2 className="card-title">다른 {leisure.label} 장소 날씨</h2>
          <nav className="place-links">
            {related.map((p) => (
              <Link key={p.slug} href={`/weather/${p.slug}`}>
                {p.name} 날씨
              </Link>
            ))}
          </nav>
        </section>
      )}
      <SiteFooter />
    </div>
  );
}
