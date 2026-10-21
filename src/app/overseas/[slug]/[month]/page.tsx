import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClimateChart, ForecastButton, GuideCard } from "@/components/CityClimate";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { CLIMATE_SOURCE, getNormals, goodMonths, monthGuide } from "@/lib/climate";
import { DESTINATIONS, getDestination, type Destination } from "@/lib/overseas";

/** 평년값만 쓰므로 미리 만들어 두지 않고 요청 때 그린다 (234곳 × 12달) */
export const dynamic = "force-dynamic";

function parse(slug: string, month: string) {
  const d = getDestination(slug);
  const m = /^(?:[1-9]|1[0-2])$/.test(month) ? Number(month) : NaN;
  if (!d || !Number.isFinite(m) || !getNormals(d.slug)) return null;
  return { d, m };
}

function title(d: Destination, m: number) {
  return `${d.name} ${m}월 날씨 · 기온·강수량·옷차림`;
}

function description(d: Destination, m: number) {
  const n = getNormals(d.slug)![m - 1];
  return `${d.name}(${d.country}) ${m}월 평년 날씨는 낮 최고 ${Math.round(n.hi)}°C, 아침 최저 ${Math.round(n.lo)}°C, 강수량 ${n.rain}mm. ${m}월 여행 옷차림과 준비물, 날씨 주의할 점을 알려드려요.`;
}

export async function generateMetadata({ params }: PageProps<"/overseas/[slug]/[month]">): Promise<Metadata> {
  const { slug, month } = await params;
  const p = parse(slug, month);
  if (!p) return {};
  const url = `/overseas/${p.d.slug}/${p.m}`;
  const image = `/api/og?slug=${p.d.slug}`;
  return {
    title: title(p.d, p.m),
    description: description(p.d, p.m),
    keywords: [p.d.name, ...(p.d.aliases ?? [])].flatMap((n) => [`${n} ${p.m}월 날씨`, `${n} ${p.m}월 옷차림`, `${n} ${p.m}월 여행`]),
    alternates: { canonical: url },
    openGraph: { title: title(p.d, p.m), description: description(p.d, p.m), url, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: title(p.d, p.m), description: description(p.d, p.m), images: [image] },
  };
}

export default async function MonthPage({ params }: PageProps<"/overseas/[slug]/[month]">) {
  const { slug, month } = await params;
  const p = parse(slug, month);
  if (!p) notFound();
  const { d, m } = p;
  const normals = getNormals(d.slug)!;
  const n = normals[m - 1];
  const good = goodMonths(d.slug).find((g) => g.month === m);
  const guide = monthGuide(d, m);
  const prev = m === 1 ? 12 : m - 1;
  const next = m === 12 ? 1 : m + 1;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "트립날씨", item: "https://tripnalc.com/" },
      { "@type": "ListItem", position: 2, name: "해외 날씨", item: "https://tripnalc.com/overseas" },
      { "@type": "ListItem", position: 3, name: `${d.name} 날씨`, item: `https://tripnalc.com/overseas/${d.slug}` },
      { "@type": "ListItem", position: 4, name: `${d.name} ${m}월 날씨`, item: `https://tripnalc.com/overseas/${d.slug}/${m}` },
    ],
  };

  return (
    <div className="shell">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="hero city-hero">
        <div className="hero-top">
          <Link href={`/overseas/${d.slug}`} className="city-back">
            ← {d.name} 여행 날씨
          </Link>
          <span>{d.country}</span>
        </div>
        <h1 className="city-name">
          {d.name} {m}월 날씨
        </h1>
        <p className="city-intro">
          {good ? `여행하기 좋은 달이에요${good.reason ? ` (${good.reason})` : ""}. ` : ""}평년 {m}월은 낮 {Math.round(n.hi)}°C, 아침 {Math.round(n.lo)}°C 안팎이에요.
        </p>
        <div className="month-stats">
          <div>
            <span>평균 최고</span>
            <b>{n.hi.toFixed(1)}°</b>
          </div>
          <div>
            <span>평균 최저</span>
            <b>{n.lo.toFixed(1)}°</b>
          </div>
          <div>
            <span>강수량</span>
            <b>{n.rain}mm</b>
          </div>
          <div>
            <span>습도</span>
            <b>{n.hum}%</b>
          </div>
        </div>
        <ForecastButton slug={d.slug} light />
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2 className="card-title">{d.name} 월별 기온·강수량</h2>
        <ClimateChart slug={d.slug} normals={normals} selected={m} />
        <p className="muted" style={{ margin: "8px 0 0" }}>
          평년값: {CLIMATE_SOURCE}(현지 고도 보정).
        </p>
      </section>

      {guide && <GuideCard title={`${m}월 ${d.name} 여행 가이드`} guide={guide} />}

      <nav className="month-nav">
        <Link href={`/overseas/${d.slug}/${prev}`}>← {prev}월</Link>
        <Link href={`/overseas/${d.slug}`}>{d.name} 전체</Link>
        <Link href={`/overseas/${d.slug}/${next}`}>{next}월 →</Link>
      </nav>

      <section className="card" style={{ marginTop: 12, textAlign: "center" }}>
        <p className="sub" style={{ margin: "0 0 10px" }}>
          평년값은 지난 20년 평균이에요. 여행 날짜가 16일 안이라면 실시간 예보를 확인하세요.
        </p>
        <ForecastButton slug={d.slug} />
      </section>

      <section className="card" style={{ marginTop: 12 }}>
        <h2 className="card-title">{d.group} 다른 여행지 {m}월 날씨</h2>
        <nav className="city-links">
          {DESTINATIONS.filter((x) => x.slug !== d.slug && x.group === d.group).map((x) => (
            <Link key={x.slug} href={`/overseas/${x.slug}/${m}`}>
              <b>{x.name}</b>
            </Link>
          ))}
        </nav>
      </section>
      <SiteFooter />
    </div>
  );
}
