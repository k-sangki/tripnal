import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AD_SLOTS, AdSlot } from "@/components/AdSlot";
import { ForecastButton, TravelPrepCard } from "@/components/CityClimate";
import { CityIssues, CityMonths } from "@/components/CityMonths";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { CLIMATE_SOURCE, climateSummary, getIntro, getNormals, goodMonths, localMonth, monthGuide, monthRanges, travelPrep } from "@/lib/climate";
import { travelFacts } from "@/lib/countryInfo";
import { seasons, wetDry } from "@/lib/season";
import { DESTINATIONS, destinationOffset, getDestination, type Destination } from "@/lib/overseas";

/** 요청마다 그린다 (현지 달이 바뀌므로). 16일 예보는 브라우저에서 따로 받아 페이지가 기다리지 않는다 */
export const dynamic = "force-dynamic";

function title(d: Destination) {
  // 열대 여행지는 "다낭 우기", "발리 건기"로 많이 찾아서 제목에 넣는다
  if (wetDry(d)) return `${d.name} 날씨 · 우기·건기 시기와 여행하기 좋은 달`;
  return `${d.name} 날씨 · 여행하기 좋은 달과 월별 옷차림`;
}

function description(d: Destination) {
  const good = monthRanges(goodMonths(d.slug).map((g) => g.month));
  const wd = wetDry(d);
  const season = wd ? ` 우기는 ${monthRanges(wd.wet)}, 건기는 ${monthRanges(wd.dry)}.` : "";
  return `${d.name}(${d.country}) 여행하기 좋은 달은 ${good}.${season} 1~12월 평년 기온·강수량과 달별 옷차림·준비물·주의할 점, 실시간 16일 날씨까지 한 번에 보고 해외여행 일정을 계획하세요.`;
}

export async function generateMetadata({ params }: PageProps<"/overseas/[slug]">): Promise<Metadata> {
  const d = getDestination((await params).slug);
  if (!d) return {};
  const url = `/overseas/${d.slug}`;
  const image = `/api/og?slug=${d.slug}`;
  return {
    title: title(d),
    description: description(d),
    keywords: [d.name, ...(d.aliases ?? [])].flatMap((n) => [
      `${n} 날씨`,
      `${n} 여행 날씨`,
      `${n} 여행 시기`,
      `${n} 옷차림`,
      ...(wetDry(d) ? [`${n} 우기`, `${n} 건기`, `${n} 우기 건기 시기`] : []),
    ]),
    alternates: { canonical: url },
    openGraph: { title: title(d), description: description(d), url, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: title(d), description: description(d), images: [image] },
  };
}

export default async function CityPage({ params }: PageProps<"/overseas/[slug]">) {
  const d = getDestination((await params).slug);
  if (!d) notFound();
  const normals = getNormals(d.slug);
  const offset = destinationOffset(d);
  const month = localMonth(offset);
  const good = goodMonths(d.slug);
  const related = DESTINATIONS.filter((x) => x.slug !== d.slug && x.group === d.group);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristDestination",
        name: d.name,
        address: d.country,
        ...(getIntro(d.slug) ? { description: getIntro(d.slug) } : {}),
        geo: { "@type": "GeoCoordinates", latitude: d.lat, longitude: d.lon },
      },
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
      <SiteHeader overseasBanner={false} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="hero city-hero">
        <div className="hero-top">
          <Link href="/overseas" className="city-back">
            ← 해외 날씨
          </Link>
          <span>
            {d.country} · {d.group}
          </span>
        </div>
        <h1 className="city-name">
          {d.name} <small>{d.en}</small>
        </h1>
        {getIntro(d.slug) && <p className="city-intro">{getIntro(d.slug)}</p>}
        <ul className="city-facts">
          {climateSummary(d).map((line) => (
            <li key={line}>{line}</li>
          ))}
          {good.length > 0 && <li>여행하기 좋은 달은 {monthRanges(good.map((g) => g.month))}이에요.</li>}
        </ul>
        <CityFacts d={d} />
        {normals && <CityIssues lat={d.lat} lon={d.lon} normals={normals} />}
        <ForecastButton slug={d.slug} light />
      </section>

      {normals && (
        <CityMonths
          slug={d.slug}
          name={d.name}
          normals={normals}
          good={good}
          guides={normals.map((_, i) => monthGuide(d, i + 1))}
          current={month}
          source={CLIMATE_SOURCE}
          country={d.country}
          goodText={monthRanges(good.map((g) => g.month))}
          seasons={seasons(d) ?? undefined}
        />
      )}

      {normals && <TravelPrepCard title={`${d.name} 여행 준비`} items={travelPrep(d)} />}

      {/* 여행 가이드 바로 아래 광고 (여행·숙박 광고가 붙기 좋은 자리) */}
      <div style={{ marginTop: 12 }}>
        <AdSlot slot={AD_SLOTS.afterSummary} />
      </div>

      <section className="card" style={{ marginTop: 12, textAlign: "center" }}>
        <p className="sub" style={{ margin: "0 0 10px" }}>
          여행 날짜가 16일 안이라면 실시간 예보로 확인하세요.
        </p>
        <ForecastButton slug={d.slug} />
      </section>

      {related.length > 0 && (
        <section className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">{d.group} 다른 여행지</h2>
          <nav className="city-links">
            {related.map((x) => (
              <Link key={x.slug} href={`/overseas/${x.slug}`}>
                <b>{x.name}</b>
              </Link>
            ))}
          </nav>
          <p className="city-links-all">
            <Link href="/overseas">해외 날씨 전체 보기 →</Link>
          </p>
        </section>
      )}
      <SiteFooter />
    </div>
  );
}

/** 여행 기본 정보 칩: 시차·통화·플러그·비행시간 */
function CityFacts({ d }: { d: Destination }) {
  const f = travelFacts(d);
  return (
    <ul className="city-info">
      <li>🕒 {f.timeDiff}</li>
      {f.currency && <li>💱 {f.currency}</li>}
      {f.plug && <li>🔌 {f.plug}</li>}
      <li>✈️ {f.flight}</li>
    </ul>
  );
}
