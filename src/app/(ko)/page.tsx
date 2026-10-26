import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { WeatherApp, type AppPlace } from "@/components/WeatherApp";
import { languageAlternates } from "@/lib/i18n";
import Link from "next/link";
import { getLeisure } from "@/lib/leisure";
import { getPlace } from "@/lib/places";
import { clampPeriod, periodLabel } from "@/lib/period";
import { kstDate } from "@/lib/time";
import { isInKorea } from "@/lib/weather";

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

/** 검색엔진이 사이트 이름을 "트립날씨"로 알 수 있게 */
const SITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "트립날씨",
  alternateName: ["tripnalc", "tripnalc.com", "트립날씨 tripnalc"],
  url: "https://tripnalc.com/",
};

/** 홈 아래 많이 찾는 장소 바로가기 */
const POPULAR: [string, string[]][] = [
  ["캠핑 날씨", ["jarasum-autocamp", "deogyudae-camp", "hantangang-camp", "nanji-camping", "hongcheongang-camp", "hagampo-camp"]],
  ["등산 날씨", ["seoraksan-daecheongbong", "jirisan-cheonwangbong", "hallasan", "bukhansan-baegundae", "gayasan", "songnisan"]],
  ["바다 물때표·낚시 날씨", ["taean", "anheung-port", "boryeong", "yeongheungdo", "jumunjin-port", "tongyeong"]],
  ["해수욕장·여행 날씨", ["jeju", "hamdeok-beach", "haeundae-beach", "gangneung", "gyeongju", "kkotji-beach"]],
  ["도시 이번주 날씨", ["seoul", "busan", "incheon", "daegu", "daejeon", "gwangju"]],
  ["자전거·스키장 날씨", ["bike-ipobo", "bike-ihwaryeong", "bike-nakdong-estuary", "yongpyong", "high1", "vivaldi-park"]],
];

/** 공유 링크(장소·기간이 붙은 주소)는 카카오톡 등에서 그 장소·기간 날씨가 미리보기로 보이게 한다 */
export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const sp = await searchParams;
  const lat = Number(one(sp.lat));
  const lon = Number(one(sp.lon));
  if (!one(sp.lat) || !Number.isFinite(lat) || !Number.isFinite(lon) || !isInKorea(lat, lon)) return {};
  const name = one(sp.name)?.slice(0, 40) || "선택한 위치";
  const leisure = getLeisure(one(sp.act));
  const period = clampPeriod(one(sp.from), one(sp.to), kstDate());
  const title = `${name} ${leisure.label} 날씨`;
  const description = `${periodLabel(period)} ${name} 날씨를 3시간 간격으로 확인하세요.`;
  const image = `/api/og?${new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4), name, act: leisure.id, from: period.from, to: period.to })}`;
  return {
    title,
    description,
    // 같은 장소라도 기간마다 다른 화면이라 검색에는 기본 주소만 남긴다
    // 영어·일본어 홈과 서로 가리킨다 (hreflang)
    alternates: { canonical: "/", languages: languageAlternates("/") },
    openGraph: { siteName: "트립날씨", locale: "ko_KR", title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const lat = Number(one(sp.lat));
  const lon = Number(one(sp.lon));
  const place: AppPlace | null =
    Number.isFinite(lat) && Number.isFinite(lon) && isInKorea(lat, lon) && one(sp.lat)
      ? { name: one(sp.name)?.slice(0, 40) || "선택한 위치", lat, lon }
      : null;

  return (
    <div className="shell">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_LD) }} />
      <WeatherApp initialPlace={place} initialLeisure={one(sp.act)} initialFrom={one(sp.from)} initialTo={one(sp.to)} initialInterval={one(sp.int)} />
      <section className="card seo-text" style={{ marginTop: 16 }}>
        <h2>놀러 갈 땐, 트립날씨: 캠핑날씨·여행날씨·이번주 날씨를 16일까지</h2>
        <p>
          트립날씨(tripnalc)는 캠핑, 등산, 낚시, 자전거, 여행처럼 밖에서 노는 날을 위한 날씨입니다. 이번주 날씨와 주말 날씨는 물론 16일 뒤까지 3시간 간격으로
          기온·비·바람·돌풍을 보여 주고, 바다는 물때표(만조·간조)와 파고, 산은 정상 고도로 보정한 기온을 함께 보여 줍니다.
        </p>
        {POPULAR.map(([title, slugs]) => (
          <div key={title}>
            <h3 className="card-title">{title}</h3>
            <nav className="place-links">
              {slugs.map((slug) => {
                const p = getPlace(slug);
                return p ? (
                  <Link key={slug} href={`/weather/${slug}`}>
                    {p.name} 날씨
                  </Link>
                ) : null;
              })}
            </nav>
          </div>
        ))}
        <p>
          <Link href="/weather">장소별 날씨 전체 보기</Link>
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
