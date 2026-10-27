import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { getLeisure, type LeisureId } from "@/lib/leisure";
import { presetPeriod } from "@/lib/period";
import { PLACES } from "@/lib/places";
import { kstDate, shortDateKo } from "@/lib/time";
import { getForecast } from "@/lib/weather";
import { codeInfo } from "@/lib/weather/codes";
import { loadWeekend, rankWeekend, weekendBest, weekendFromForecast, type WeekendData } from "@/lib/weekend";

/** 수집 작업이 하루 두 번 올리는 R2 자료를 요청 때 읽는다 */
export const dynamic = "force-dynamic";

const WEEKEND_TITLE = "이번 주말 날씨 좋은 곳 · 집에만 있긴 아까운 캠핑장·산·바다 추천";

/** 설명에 이번 주말 1등 장소를 넣는다 (검색 결과에서 바로 답이 보이게, CTR 개선 2026-10-27) */
export async function generateMetadata(): Promise<Metadata> {
  const w = weekendBest(await loadWeekend(), kstDate());
  const description = w
    ? `이번 주말(${w.range}) 날씨 1등 ${w.best}! 비·바람·기온으로 매긴 캠핑장·명산·여행지·낚시 포인트 순위, 집에 있으면 손해입니다.`
    : "이번 주말 비가 없고 바람이 약한 캠핑장, 100대 명산, 국내 여행지, 바다낚시 포인트를 최신 예보로 골라 순위로 보여드립니다. 주말 여행 일정을 날씨로 정하세요.";
  return { title: WEEKEND_TITLE, description, alternates: { canonical: "/weekend" } };
}

const ORDER: LeisureId[] = ["camping", "hiking", "travel", "fishing", "cycling", "ski"];

/** 개발 환경(R2 없음)에서는 예보를 직접 받아 같은 모양으로 만든다 */
async function devData(): Promise<WeekendData> {
  const w = presetPeriod("weekend", kstDate());
  const dates = w.from === w.to ? [w.from] : [w.from, w.to];
  const places: WeekendData["places"] = {};
  await Promise.all(
    PLACES.filter((p) => ORDER.includes(p.leisure)).map(async (p) => {
      const s = weekendFromForecast(await getForecast(p.lat, p.lon, p.elevation), dates);
      if (s) places[p.slug] = s;
    }),
  );
  return { generated: new Date().toISOString(), dates, places };
}

export default async function WeekendPage() {
  let data = await loadWeekend();
  if (!data && process.env.NODE_ENV === "development") data = await devData();
  const today = kstDate();
  // 지난 주말 자료면 쓰지 않는다 (새 자료는 하루 두 번 올라온다)
  const fresh = data && data.dates[data.dates.length - 1] >= today ? data : null;
  const range = fresh ? fresh.dates.map(shortDateKo).join("~") : "";
  const query = fresh ? `?from=${fresh.dates[0]}&to=${fresh.dates[fresh.dates.length - 1]}` : "";
  // 스키장은 시즌(12~3월)에만
  const month = Number(today.slice(5, 7));
  const groups = ORDER.filter((id) => id !== "ski" || month >= 12 || month <= 3);

  return (
    <div className="shell">
      <SiteHeader />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>이번 주말 날씨 좋은 곳</h1>
      <p className="sub" style={{ margin: "4px 0 12px" }}>
        {fresh ? `${range} 예보 기준 · 비·바람·기온으로 매긴 날씨 점수 순` : "이번 주말 예보를 정리하는 중이에요. 잠시 후 다시 확인해 주세요."}
      </p>

      {fresh &&
        groups.map((id) => {
          const l = getLeisure(id);
          const picks = rankWeekend(fresh, id);
          if (!picks.length) return null;
          return (
            <section key={id} className="card" style={{ marginTop: 12 }}>
              <h2 className="card-title">
                {l.emoji} 주말 {l.label} 가기 좋은 곳
              </h2>
              <ol className="wk-list">
                {picks.map((x, i) => (
                  <li key={x.place.slug}>
                    <Link href={`/weather/${x.place.slug}${query}`}>
                      <span className="wk-rank">{i + 1}</span>
                      <span className="wk-name">
                        <b>{x.place.name}</b>
                        <small>{x.place.region}</small>
                      </span>
                      <span className="wk-wx">
                        <span>
                          {codeInfo(x.code).day} {x.tMin != null && x.tMax != null ? `${Math.round(x.tMin)}~${Math.round(x.tMax)}°` : ""}
                        </span>
                        <small>
                          비 {x.rain}mm{x.gust != null ? ` · 돌풍 ${Math.round(x.gust)}m/s` : ""}
                        </small>
                      </span>
                      <span className={`wk-score${x.score >= 8 ? " hi" : x.score >= 6 ? " mid" : ""}`}>{x.score.toFixed(1)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}

      <section className="card seo-text" style={{ marginTop: 16 }}>
        <h2>주말 날씨 점수는 이렇게 매겨요</h2>
        <p>
          트립날씨에 등록된 캠핑장·명산·여행지·바다낚시 포인트·자전거길 인증센터의 이번 주말 예보를 모아 10점에서 시작해 비의 양과 강수 확률, 돌풍,
          더위·추위만큼 점수를 뺍니다. 낚시와 자전거는 바람에 더 민감하게, 스키장은 눈이 오면 감점하지 않습니다.
        </p>
        <p>
          예보는 유럽(ECMWF)·미국(GFS)·독일(ICON) 세 모델의 중간값이며 하루 두 번 새로 계산합니다. 장소를 누르면 그 주말의 3시간 간격 날씨를 바로 볼 수
          있어요. 주말 캠핑·등산·여행 일정을 정할 때 참고하세요.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
