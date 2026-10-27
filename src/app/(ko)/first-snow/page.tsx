import type { Metadata } from "next";
import Link from "next/link";
import { SeasonNav, SeasonRow } from "@/components/Season";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { PLACES } from "@/lib/places";
import { SEASON_CITIES, seasonDays, snowRows, type SnowRow } from "@/lib/seasonal";
import { kstDate, shortDateKo } from "@/lib/time";

/** 수집 작업이 하루 두 번 올리는 R2 자료를 요청 때 읽는다 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "첫눈 예보 · 올해 첫눈 언제? 고백 타이밍은 날씨가 정함",
  description:
    "서울·춘천·대전·광주 등 전국 20개 도시와 명산 정상의 첫눈 예보, 첫 영하 날짜를 2주 앞까지 미리 보여드립니다. 패딩 꺼낼 날도 같이 확인하세요.",
  alternates: { canonical: "/first-snow" },
};

const MOUNTAINS = PLACES.filter((p) => p.leisure === "hiking").map((p) => p.slug);

function temp(x: number | null): string {
  return x == null ? "" : `${Math.round(x)}°`;
}

function rowFor(r: SnowRow) {
  return (
    <SeasonRow
      key={r.place.slug}
      href={`/weather/${r.place.slug}`}
      name={r.place.name}
      region={r.place.region}
      main={r.snow ? `🌨️ ${shortDateKo(r.snow)}` : "2주 안엔 없음"}
      sub={`${r.freeze ? `첫 영하 ${shortDateKo(r.freeze)} · ` : ""}최저 ${temp(r.tMin)}`}
      badge={r.snow ? "눈 예보" : r.freeze ? "영하" : undefined}
      tone={r.snow ? "hi" : r.freeze ? "mid" : undefined}
    />
  );
}

export default async function FirstSnowPage() {
  const today = kstDate();
  const data = await seasonDays([...SEASON_CITIES, ...MOUNTAINS], today);
  const cities = data ? snowRows(data, SEASON_CITIES, today) : [];
  const peaks = data ? snowRows(data, MOUNTAINS, today).filter((r) => r.snow) : [];
  const first = cities.find((r) => r.snow);

  return (
    <div className="shell">
      <SiteHeader />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>첫눈 예보</h1>
      <p className="sub" style={{ margin: "4px 0 0" }}>
        앞으로 2주 예보에서 눈 소식이 있는 날 · 세 모델 중간값 기준
      </p>
      <SeasonNav current="/first-snow" />

      {!data ? (
        <p className="sub" style={{ marginTop: 12 }}>
          예보를 정리하는 중이에요. 잠시 후 다시 확인해 주세요.
        </p>
      ) : (
        <>
          <section className="card" style={{ marginTop: 12 }}>
            <p className="season-summary">
              {first ? (
                <>
                  도시 중 가장 먼저 눈 예보가 있는 곳은 <b>{first.place.name}</b>, <b>{shortDateKo(first.snow!)}</b>이에요.
                </>
              ) : (
                <>2주 안에 도시 눈 예보는 아직 없어요. 첫눈은 보통 높은 산 정상부터 와요.</>
              )}{" "}
              명산 정상은 {peaks.length ? <b>{peaks.length}곳</b> : "아직 0곳"}에 눈 예보가 있어요.
            </p>
          </section>

          <section className="card" style={{ marginTop: 12 }}>
            <h2 className="card-title">🏙️ 도시별 첫눈 예보</h2>
            <ol className="wk-list">{cities.map(rowFor)}</ol>
          </section>

          {peaks.length > 0 && (
            <section className="card" style={{ marginTop: 12 }}>
              <h2 className="card-title">⛰️ 눈 예보 있는 명산 (정상 기준)</h2>
              <ol className="wk-list">{peaks.slice(0, 15).map(rowFor)}</ol>
            </section>
          )}

          <nav className="place-links" style={{ marginTop: 12 }}>
            <Link href="/ski">⛷️ 스키장 제설·눈 예보 →</Link>
          </nav>
        </>
      )}

      <section className="card seo-text" style={{ marginTop: 16 }}>
        <h2>첫눈 예보는 이렇게 봐요</h2>
        <p>
          유럽(ECMWF)·미국(GFS)·독일(ICON) 세 예보 모델의 중간값에서 하루 날씨가 눈(진눈깨비·눈 소나기 포함)으로 나온 첫날을 보여드립니다. 하루 두 번
          새로 계산하며, 2주 뒤 예보는 바뀔 수 있어요.
        </p>
        <p>
          기상청이 발표하는 공식 첫눈은 각 지역 관측소에서 눈이 내리는 것을 실제로 본 날이라, 몇 송이만 날려도 첫눈으로 기록됩니다. 그래서 예보보다
          조금 이르거나 늦을 수 있어요. 산은 정상 높이로 기온을 고쳐 계산해서 도시보다 훨씬 일찍 눈 예보가 나옵니다.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
