import type { Metadata } from "next";
import { SeasonNav, SeasonRow } from "@/components/Season";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { kimjangRows, SEASON_CITIES, seasonDays } from "@/lib/seasonal";
import { kstDate, shortDateKo } from "@/lib/time";

/** 수집 작업이 하루 두 번 올리는 R2 자료를 요청 때 읽는다 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "김장 날씨 · 김장 언제 할까? 배추 절이기 딱 좋은 추위 오는 날",
  description:
    "기상청 김장 적기 기준(하루 평균 4도 이하·최저 0도 이하)으로 서울·대전·대구·광주·부산 등 전국 20개 도시의 김장하기 좋은 날을 2주 앞까지 알려드립니다.",
  alternates: { canonical: "/kimjang" },
};

export default async function KimjangPage() {
  const today = kstDate();
  const data = await seasonDays(SEASON_CITIES, today);
  const rows = data ? kimjangRows(data, today) : [];
  const ready = rows.filter((r) => r.first);

  return (
    <div className="shell">
      <SiteHeader />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>김장 날씨 · 김장하기 좋은 날</h1>
      <p className="sub" style={{ margin: "4px 0 0" }}>
        앞으로 2주 예보 · 기상청 김장 적기 기준(평균 4도 이하, 최저 0도 이하)
      </p>
      <SeasonNav current="/kimjang" />

      {!data ? (
        <p className="sub" style={{ marginTop: 12 }}>
          예보를 정리하는 중이에요. 잠시 후 다시 확인해 주세요.
        </p>
      ) : (
        <>
          <section className="card" style={{ marginTop: 12 }}>
            <p className="season-summary">
              {ready.length ? (
                <>
                  20개 도시 중 <b>{ready.length}곳</b>이 2주 안에 김장 적기 추위에 들어가요. 가장 빠른 곳은 <b>{ready[0].place.name}</b>(
                  {shortDateKo(ready[0].first!)})이에요.
                </>
              ) : (
                <>2주 안에 김장 적기 추위가 오는 도시는 아직 없어요. 배추는 조금 더 밭에서 버텨도 돼요.</>
              )}
            </p>
          </section>

          <section className="card" style={{ marginTop: 12 }}>
            <h2 className="card-title">🥬 도시별 김장 적기</h2>
            <ol className="wk-list">
              {rows.map((r) => (
                <SeasonRow
                  key={r.place.slug}
                  href={`/weather/${r.place.slug}`}
                  name={r.place.name}
                  region={r.place.region}
                  main={r.first ? `${shortDateKo(r.first)}부터` : "2주 안엔 아직"}
                  sub={`가장 추운 날 평균 ${r.coldestMean ?? "-"}° · 최저 ${r.tMin == null ? "-" : `${Math.round(r.tMin)}°`}`}
                  badge={r.first ? "적기" : undefined}
                  tone={r.first ? "hi" : undefined}
                />
              ))}
            </ol>
          </section>
        </>
      )}

      <section className="card seo-text" style={{ marginTop: 16 }}>
        <h2>김장 적기는 이렇게 정해요</h2>
        <p>
          기상청은 하루 평균기온이 4도 이하로 내려가고 최저기온이 0도 이하일 때를 김장하기 좋은 때로 봅니다. 너무 따뜻하면 김치가 빨리 시어지고, 너무
          추우면 배추가 얼어 절이기 어려워요. 앞으로 2주 예보에서 이 기준을 처음 만족하는 날을 도시별로 보여드립니다.
        </p>
        <p>
          예보는 유럽(ECMWF)·미국(GFS)·독일(ICON) 세 모델의 중간값이며 하루 두 번 새로 계산합니다. 도시를 누르면 김장하는 날 비 소식과 바람까지 3시간
          간격으로 확인할 수 있어요.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
