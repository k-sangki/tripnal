import type { Metadata } from "next";
import { SeasonNav, SeasonRow } from "@/components/Season";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { PLACES } from "@/lib/places";
import { SNOWMAKING_C, seasonDays, skiRows } from "@/lib/seasonal";
import { kstDate, shortDateKo } from "@/lib/time";

/** 수집 작업이 하루 두 번 올리는 R2 자료를 요청 때 읽는다 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "스키장 날씨 · 개장 언제? 제설기 돌릴 만큼 추운 밤 세어 봄",
  description:
    "용평·하이원·휘닉스·비발디·곤지암 등 전국 스키장 14곳의 밤 최저기온, 인공 눈을 만들 수 있는 영하 3도 이하 밤, 눈 예보를 2주 앞까지 비교해 드립니다.",
  alternates: { canonical: "/ski" },
};

const SKI = PLACES.filter((p) => p.leisure === "ski").map((p) => p.slug);

export default async function SkiPage() {
  const today = kstDate();
  const data = await seasonDays(SKI, today);
  const rows = data ? skiRows(data, today) : [];
  const ready = rows.filter((r) => r.nights > 0).length;

  return (
    <div className="shell">
      <SiteHeader />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>스키장 날씨 · 제설 가능한 밤</h1>
      <p className="sub" style={{ margin: "4px 0 0" }}>
        앞으로 2주 예보 · 밤 최저 {SNOWMAKING_C}도 이하인 날이 많은 순
      </p>
      <SeasonNav current="/ski" />

      {!data ? (
        <p className="sub" style={{ marginTop: 12 }}>
          예보를 정리하는 중이에요. 잠시 후 다시 확인해 주세요.
        </p>
      ) : (
        <>
          <section className="card" style={{ marginTop: 12 }}>
            <p className="season-summary">
              스키장 {rows.length}곳 중 <b>{ready}곳</b>에 2주 안에 인공 눈을 만들 만큼 추운 밤이 있어요.
              {rows[0]?.nights ? (
                <>
                  {" "}
                  가장 많은 곳은 <b>{rows[0].place.name}</b>({rows[0].nights}일)이에요.
                </>
              ) : (
                " 아직은 제설기보다 단풍 구경이 먼저예요."
              )}
            </p>
          </section>

          <section className="card" style={{ marginTop: 12 }}>
            <h2 className="card-title">⛷️ 스키장별 제설 가능한 밤</h2>
            <ol className="wk-list">
              {rows.map((r) => (
                <SeasonRow
                  key={r.place.slug}
                  href={`/weather/${r.place.slug}`}
                  name={r.place.name}
                  region={r.place.region}
                  main={r.firstNight ? `첫 제설 밤 ${shortDateKo(r.firstNight)}` : "아직 따뜻해요"}
                  sub={`최저 ${r.tMin == null ? "-" : `${Math.round(r.tMin)}°`}${r.snow ? ` · 🌨️ ${shortDateKo(r.snow)}` : ""}`}
                  badge={`${r.nights}일`}
                  tone={r.nights >= 5 ? "hi" : r.nights > 0 ? "mid" : undefined}
                />
              ))}
            </ol>
          </section>
        </>
      )}

      <section className="card seo-text" style={{ marginTop: 16 }}>
        <h2>스키장 개장은 추운 밤이 정해요</h2>
        <p>
          국내 스키장은 대부분 인공 눈으로 슬로프를 만들어 문을 엽니다. 제설기는 보통 기온이 영하 3도 아래로 내려가고 공기가 건조할 때 잘 돌아가서,
          이런 밤이 며칠 이어져야 개장 준비가 끝나요. 그래서 밤 최저기온이 영하 3도 이하인 날 수를 세어 순서대로 보여드립니다.
        </p>
        <p>
          실제 개장일은 리조트마다 따로 발표하니 방문 전 공지를 확인하세요. 예보는 유럽(ECMWF)·미국(GFS)·독일(ICON) 세 모델의 중간값이며 하루 두 번 새로
          계산합니다. 스키장을 누르면 3시간 간격 날씨와 바람·체감온도를 볼 수 있어요.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
