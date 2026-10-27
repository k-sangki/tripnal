import type { Metadata } from "next";
import { SeasonNav, SeasonRow } from "@/components/Season";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { presetPeriod } from "@/lib/period";
import { FOLIAGE_PEAK, foliageRows, seasonDays, type FoliageStatus } from "@/lib/seasonal";
import { kstDate, shortDateKo } from "@/lib/time";
import { codeInfo } from "@/lib/weather/codes";

/** 수집 작업이 하루 두 번 올리는 R2 자료를 요청 때 읽는다 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "단풍 절정 시기·날씨 · 설악산부터 내장산까지, 늦으면 낙엽만 봄",
  description:
    "설악산·오대산·지리산·내장산·한라산 등 유명산 19곳의 평년 단풍 절정일과 이번 주말 정상 날씨를 한눈에. 단풍 산행 날짜를 날씨로 정하세요.",
  alternates: { canonical: "/autumn-foliage" },
};

const GROUPS: { id: FoliageStatus; title: string; badge: string; tone?: "hi" | "mid" }[] = [
  { id: "peak", title: "🍁 이번 주말 절정 무렵", badge: "절정", tone: "hi" },
  { id: "soon", title: "🍂 곧 절정", badge: "곧", tone: "mid" },
  { id: "later", title: "🌿 아직 일러요", badge: "아직" },
  { id: "past", title: "🍃 올해는 지났어요", badge: "지남" },
];

export default async function FoliagePage() {
  const today = kstDate();
  const w = presetPeriod("weekend", today);
  const data = await seasonDays(Object.keys(FOLIAGE_PEAK), today);
  const rows = foliageRows(w.from);
  const range = w.from === w.to ? shortDateKo(w.from) : `${shortDateKo(w.from)}~${shortDateKo(w.to)}`;

  function weekend(slug: string) {
    const days = (data?.places[slug] ?? []).filter((d) => d.date >= w.from && d.date <= w.to);
    if (!days.length) return null;
    const lo = Math.min(...days.map((d) => d.tMin ?? 99));
    const hi = Math.max(...days.map((d) => d.tMax ?? -99));
    const rain = Math.round(days.reduce((a, d) => a + (d.rain ?? 0), 0) * 10) / 10;
    const code = Math.max(...days.map((d) => d.code ?? 0));
    return { main: `${codeInfo(code).day} ${Math.round(lo)}~${Math.round(hi)}°`, rain };
  }

  return (
    <div className="shell">
      <SiteHeader />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>단풍 절정 시기와 주말 날씨</h1>
      <p className="sub" style={{ margin: "4px 0 0" }}>
        기상청 평년 단풍 절정일 · {range} 정상 날씨
      </p>
      <SeasonNav current="/autumn-foliage" />

      {GROUPS.map((g) => {
        const list = rows.filter((r) => r.status === g.id);
        if (!list.length) return null;
        return (
          <section key={g.id} className="card" style={{ marginTop: 12 }}>
            <h2 className="card-title">{g.title}</h2>
            <ol className="wk-list">
              {list.map((r) => {
                const x = weekend(r.place.slug);
                return (
                  <SeasonRow
                    key={r.place.slug}
                    href={`/weather/${r.place.slug}?from=${w.from}&to=${w.to}`}
                    name={r.place.name}
                    region={`평년 절정 ${shortDateKo(r.peak)}`}
                    main={x ? x.main : "예보 준비 중"}
                    sub={x ? `주말 비 ${x.rain}mm` : undefined}
                    badge={g.badge}
                    tone={g.tone}
                  />
                );
              })}
            </ol>
          </section>
        );
      })}

      <section className="card seo-text" style={{ marginTop: 16 }}>
        <h2>단풍 절정일과 날씨 보는 법</h2>
        <p>
          단풍 절정은 산 전체의 80% 정도가 물든 때를 말합니다. 여기 날짜는 기상청이 유명산마다 관측해 온 평년 절정일이라 해마다 며칠씩 앞뒤로
          달라질 수 있어요. 보통 강원 북부 설악산·오대산이 10월 중순에 가장 먼저 물들고, 하루 20~25km씩 남쪽으로 내려와 해남 두륜산이 11월 초중순에
          마지막으로 절정을 맞습니다.
        </p>
        <p>
          옆의 날씨는 이번 주말 정상 높이로 고쳐 계산한 기온이에요. 단풍철 정상은 영하로 떨어지는 날이 많으니 바람막이와 장갑을 꼭 챙기세요. 산을 누르면
          3시간 간격 날씨와 정상 체감온도, 일몰 시각을 볼 수 있습니다.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
