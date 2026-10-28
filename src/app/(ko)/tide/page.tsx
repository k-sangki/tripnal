import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { seasonDays } from "@/lib/seasonal";
import { loadTideDay, muldaeWeek, SEAS, TIDE_PLACES, tideRows } from "@/lib/tide";
import { kstDate, shortDateKo } from "@/lib/time";

/** 만조·간조와 바람은 R2 자료를 요청 때 읽는다 (엣지 캐시 1시간) */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // 네이버 검색량(2026-10-28): 물때표 10만, 바다날씨 5만, 서해안 물때표 1.2만
  title: "물때표 · 오늘 몇 물? 서해·남해·동해·제주 바다날씨, 배 뜰 바람인지",
  description:
    "오늘 물때(7물때식)와 일주일 물때표, 인천·태안·여수·통영·포항·제주 등 전국 바다낚시 포인트의 만조·간조 시각과 바람·돌풍을 한 화면에. 국립해양조사원 조석 예보 기준.",
  alternates: { canonical: "/tide" },
};

export default async function TidePage() {
  const today = kstDate();
  const week = muldaeWeek(today);
  const [tides, days] = await Promise.all([loadTideDay(TIDE_PLACES, today), seasonDays(TIDE_PLACES.map((p) => p.slug), today)]);

  return (
    <div className="shell">
      <SiteHeader />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>물때표 · 전국 바다날씨</h1>
      <p className="sub" style={{ margin: "4px 0 0" }}>
        {shortDateKo(today)} · 만조·간조는 가장 가까운 국립해양조사원 관측소 기준
      </p>

      <section className="card" style={{ marginTop: 12 }}>
        <p className="season-summary">
          오늘은 <b className={`tide-mul ${week[0].tone ?? ""}`}>{week[0].name}</b>
          {week[0].tone === "sari" ? ", 물살이 센 사리 때예요." : week[0].tone === "jogeum" ? ", 물살이 약한 조금 때예요." : "이에요."}
        </p>
        <ol className="tide-week">
          {week.map((d) => (
            <li key={d.date} className={d.tone ?? ""}>
              <small>{shortDateKo(d.date).replace(/^\d+\//, "")}</small>
              <b>{d.name}</b>
            </li>
          ))}
        </ol>
      </section>

      <nav className="season-nav" aria-label="바다">
        {SEAS.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.label}
          </a>
        ))}
      </nav>

      {SEAS.map((s) => {
        const rows = tideRows(s.id, tides, days?.places, today);
        return (
          <section key={s.id} id={s.id} className="card" style={{ marginTop: 12 }}>
            <h2 className="card-title">
              🌊 {s.label} 물때표·바다날씨 ({rows.length}곳)
            </h2>
            <ol className="wk-list">
              {rows.map(({ place, tide, day }) => (
                <li key={place.slug}>
                  <Link href={`/weather/${place.slug}`}>
                    <span className="wk-name">
                      <b>{place.name}</b>
                      <small>{place.region}</small>
                    </span>
                    <span className="wk-wx tide-times">
                      <span>
                        <i className="hi">만조</i> {tide?.high.join(" · ") || "-"}
                      </span>
                      <span>
                        <i className="lo">간조</i> {tide?.low.join(" · ") || "-"}
                      </span>
                      <small>
                        {day?.wind == null ? "바람 -" : `바람 ${Math.round(day.wind)}m/s`} · {day?.gust == null ? "돌풍 -" : `돌풍 ${Math.round(day.gust)}m/s`}
                      </small>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <section className="card seo-text" style={{ marginTop: 16 }}>
        <h2>물때표 보는 법</h2>
        <p>
          물때는 달의 모양(음력 날짜)으로 정해져요. 보름과 그믐 무렵이 7물로 바닷물이 가장 많이 들고 나는 사리, 상현·하현 무렵의 조금·무시는 물살이
          가장 약해요. 서해에서 흔히 쓰는 7물때식으로 표시했어요.
        </p>
        <p>
          만조는 바닷물이 가장 높이 찬 때, 간조는 가장 많이 빠진 때예요. 하루에 대개 두 번씩 오고, 날마다 50분쯤 늦어져요. 장소를 누르면 3시간 간격의
          바다날씨(파고·바람·돌풍)와 2주 물때를 함께 볼 수 있어요.
        </p>
        <h2>바다날씨는 돌풍부터</h2>
        <p>
          평균 풍속보다 순간 돌풍이 배와 갯바위를 흔들어요. 돌풍이 세게 예보된 날은 낚싯배가 출항하지 않을 수 있으니 선장님 공지를 꼭 확인하세요. 바람은
          유럽(ECMWF)·미국(GFS)·독일(ICON) 세 모델의 중간값이에요.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
