import { AD_SLOTS, AdSlot } from "@/components/AdSlot";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { TripFinder } from "@/components/TripFinder";
import { bestForMonth, CLIMATE_SOURCE } from "@/lib/climate";
import { parseQuery } from "@/lib/finder";
import { DESTINATIONS, DESTINATION_GROUPS } from "@/lib/overseas";
import { finderRows, SEOUL_HI } from "@/lib/season";

/** 그달 날씨가 특히 좋은 여행지 이름 (점수 순) */
export function bestNames(m: number, n = 6) {
  const all = [...bestForMonth(DESTINATIONS, m).values()].flat().sort((a, b) => b.score - a.score);
  return all.slice(0, n).map((x) => x.d.name);
}

/** 해외 날씨·여행지 찾기 화면. /overseas(이번 달)와 /overseas/month/{m}(그 달)이 같이 쓴다 */
export function OverseasFinder({ month: m, sp }: { month: number; sp: URLSearchParams }) {
  const top = bestNames(m, 5);
  return (
    <div className="shell">
      <SiteHeader overseasBanner={false} />
      <TripFinder rows={finderRows(DESTINATIONS)} groups={DESTINATION_GROUPS} month={m} initial={parseQuery(sp, m)} seoulHi={SEOUL_HI} />

      <div style={{ marginTop: 12 }}>
        <AdSlot slot={AD_SLOTS.afterSummary} />
      </div>

      <section className="card seo-text" style={{ marginTop: 12 }}>
        <h2>{m}월 해외여행지는 이렇게 골랐어요</h2>
        <p>
          여행지마다 지난 20년({CLIMATE_SOURCE}) {m}월 평균 낮 기온, 강수량, 비 온 날 수, 습도로 걷기 편한 정도를 점수로 매기고, 1년 중 점수가 높은 달을
          &quot;여행하기 좋은 달&quot;로 정했어요. {top.length > 0 && `${m}월에는 ${top.join("·")}의 날씨가 특히 좋아요.`}
        </p>
        <p>
          간절기는 여행하기 좋은 달 바로 앞뒤 달이에요. 건기에서 우기로, 또는 우기에서 건기로 넘어가는 때라 비가 와도 하루 종일보다 잠깐씩 오는 날이 많고,
          성수기보다 보통 항공권·숙소가 저렴해요. 비수기는 우기·무더위·추위 등으로 날씨는 아쉽지만 보통 가장 저렴하게 다녀올 수 있는 시기예요. 태풍·허리케인
          시기가 겹치면 ⚠️로 표시했으니 항공편 결항 가능성을 꼭 확인하세요.
        </p>
        <p>도시를 누르면 그달 평년 기온·강수량과 옷차림, 날씨 주의할 점, 여행 준비 안내, 현지 시간 기준 실시간 16일 날씨를 볼 수 있어요.</p>
      </section>
      <SiteFooter />
    </div>
  );
}

export async function toParams(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") sp.set(k, v);
  return sp;
}
