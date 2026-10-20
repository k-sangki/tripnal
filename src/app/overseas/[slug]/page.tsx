import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { WeatherApp } from "@/components/WeatherApp";
import { DESTINATIONS, destinationOffset, getDestination, type Destination } from "@/lib/overseas";
import { placeSummary } from "@/lib/seo";
import { getForecast } from "@/lib/weather";
import type { Forecast } from "@/lib/weather/types";

/** 요청마다 그린다 (현지 날짜가 바뀌므로) */
export const dynamic = "force-dynamic";

function title(d: Destination) {
  return `${d.name} 날씨 · 이번주 ${d.country} 여행 날씨 16일`;
}

function description(d: Destination) {
  return `${d.name}(${d.country}) 오늘부터 16일까지 3시간 간격 날씨를 현지 시간으로. 기온·체감온도·비·바람과 일출·일몰을 한눈에 보고 해외여행 일정과 옷차림을 정하세요.`;
}

export async function generateMetadata({ params }: PageProps<"/overseas/[slug]">): Promise<Metadata> {
  const d = getDestination((await params).slug);
  if (!d) return {};
  const url = `/overseas/${d.slug}`;
  const image = `/api/og?slug=${d.slug}`;
  return {
    title: title(d),
    description: description(d),
    keywords: [d.name, ...(d.aliases ?? [])].flatMap((n) => [`${n} 날씨`, `${n} 이번주 날씨`, `${n} 16일 날씨`]),
    alternates: { canonical: url },
    openGraph: { title: title(d), description: description(d), url, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: title(d), description: description(d), images: [image] },
  };
}

export default async function DestinationPage({ params }: PageProps<"/overseas/[slug]">) {
  const d = getDestination((await params).slug);
  if (!d) notFound();
  const offset = destinationOffset(d);

  let forecast: Forecast | null = null;
  try {
    forecast = await getForecast(d.lat, d.lon, d.elevation, undefined, offset);
  } catch (e) {
    console.error(e);
  }

  const related = DESTINATIONS.filter((x) => x.slug !== d.slug && x.group === d.group);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Place", name: d.name, address: d.country, geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lon } },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "트립날씨", item: "https://tripnalc.com/" },
          { "@type": "ListItem", position: 2, name: "해외 날씨", item: "https://tripnalc.com/overseas" },
          { "@type": "ListItem", position: 3, name: `${d.name} 날씨`, item: `https://tripnalc.com/overseas/${d.slug}` },
        ],
      },
    ],
  };

  return (
    <div className="shell">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <WeatherApp
        initialPlace={{ name: d.name, lat: d.lat, lon: d.lon, address: d.country, slug: d.slug }}
        initialForecast={forecast}
        initialLeisure="travel"
        headingSuffix="16일 날씨"
        overseasOffset={offset}
      />

      <section className="card seo-text" style={{ marginTop: 16 }}>
        <h2>{d.name} 여행 날씨 요약</h2>
        {forecast ? placeSummary({ name: d.name, leisure: "travel" }, forecast).map((line) => <p key={line}>{line}</p>) : <p>예보를 불러오는 중입니다.</p>}
        <p>
          {d.name}({d.country})의 날씨를 오늘부터 최대 16일까지 3시간 간격으로, 모두 현지 시간 기준으로 보여드립니다. 기간을 직접 고르면 여행 일정만
          볼 수 있고, 캡처 버튼으로 이미지를 저장해 일행과 공유할 수 있습니다.
        </p>
      </section>

      {related.length > 0 && (
        <section className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">{d.group} 다른 여행지 날씨</h2>
          <nav className="place-links">
            {related.map((x) => (
              <Link key={x.slug} href={`/overseas/${x.slug}`}>
                {x.name} 날씨
              </Link>
            ))}
            <Link href="/overseas">해외 날씨 전체</Link>
          </nav>
        </section>
      )}
      <SiteFooter />
    </div>
  );
}
