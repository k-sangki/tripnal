import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AD_SLOTS, AdSlot } from "@/components/AdSlot";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { bestForMonth, CLIMATE_SOURCE } from "@/lib/climate";
import { DESTINATIONS, DESTINATION_GROUPS } from "@/lib/overseas";

/** 평년값만 쓰므로 요청 때 그려도 가볍다 */
export const dynamic = "force-dynamic";

function parse(month: string) {
  return /^(?:[1-9]|1[0-2])$/.test(month) ? Number(month) : null;
}

function names(m: number, n = 6) {
  const all = [...bestForMonth(DESTINATIONS, m).values()].flat().sort((a, b) => b.score - a.score);
  return all.slice(0, n).map((x) => x.d.name);
}

export async function generateMetadata({ params }: PageProps<"/overseas/month/[month]">): Promise<Metadata> {
  const m = parse((await params).month);
  if (!m) return {};
  const title = `${m}월 해외여행 추천 · ${m}월에 가기 좋은 해외 여행지와 날씨`;
  const description = `${m}월에 날씨가 좋은 해외 여행지를 지역별로 모았어요. ${names(m).join("·")} 등 평년 기온·강수량과 옷차림을 보고 ${m}월 해외여행 일정을 계획하세요.`;
  const url = `/overseas/month/${m}`;
  return {
    title,
    description,
    keywords: [`${m}월 해외여행`, `${m}월 해외여행 추천`, `${m}월 여행지 추천`, `${m}월에 가기 좋은 나라`],
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function BestMonthPage({ params }: PageProps<"/overseas/month/[month]">) {
  const m = parse((await params).month);
  if (!m) notFound();
  const best = bestForMonth(DESTINATIONS, m);
  const total = [...best.values()].reduce((a, x) => a + x.length, 0);
  const top = names(m, 5);

  return (
    <div className="shell">
      <SiteHeader overseasBanner={false} />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>{m}월에 가기 좋은 해외 여행지</h1>
      <p className="muted" style={{ margin: "4px 0 12px" }}>
        해외 {DESTINATIONS.length}곳 중 {m}월 날씨가 여행하기 좋은 {total}곳이에요. 날씨가 좋은 순서로 정리했어요.
      </p>
      <nav className="month-chips" aria-label="다른 달">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((x) => (
          <Link key={x} href={`/overseas/month/${x}`} className={x === m ? "on" : undefined} aria-current={x === m ? "page" : undefined}>
            {x}월
          </Link>
        ))}
      </nav>

      {DESTINATION_GROUPS.filter((g) => best.get(g)?.length).map((g) => (
        <section key={g} className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">
            {g} <small className="muted">{best.get(g)!.length}곳</small>
          </h2>
          <nav className="best-grid">
            {best.get(g)!.map(({ d, normal, reason }) => (
              <Link key={d.slug} href={`/overseas/${d.slug}/${m}`} className="best-card">
                <span className="best-name">
                  <b>{d.name}</b>
                  {d.country !== g && <small>{d.country}</small>}
                </span>
                <span className="best-wx">
                  <span className="t-hi">{Math.round(normal.hi)}°</span> / <span className="t-lo">{Math.round(normal.lo)}°</span> · 💧{normal.rain}mm
                </span>
                {reason && <em>{reason}</em>}
              </Link>
            ))}
          </nav>
        </section>
      ))}

      <div style={{ marginTop: 12 }}>
        <AdSlot slot={AD_SLOTS.afterSummary} />
      </div>

      <section className="card seo-text" style={{ marginTop: 12 }}>
        <h2>{m}월 해외여행지는 이렇게 골랐어요</h2>
        <p>
          여행지마다 지난 20년({CLIMATE_SOURCE}) {m}월 평균 낮 기온, 강수량, 비 온 날 수, 습도로 걷기 편한 정도를 점수로 매기고, 1년 중 점수가 높은 달을
          &quot;여행하기 좋은 달&quot;로 정했어요. {top.length > 0 && `${m}월에는 ${top.join("·")}의 날씨가 특히 좋아요.`}
        </p>
        <p>도시를 누르면 {m}월 평년 기온·강수량과 옷차림, 날씨 주의할 점, 여행 준비 안내를 볼 수 있어요.</p>
      </section>
      <SiteFooter />
    </div>
  );
}
