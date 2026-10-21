import Link from "next/link";
import type { GoodMonth, MonthGuide, MonthNormal, PrepItem } from "@/lib/climate";

/** 실시간 16일 예보 페이지로 가는 버튼 */
export function ForecastButton({ slug, light }: { slug: string; light?: boolean }) {
  return (
    <Link href={`/overseas/${slug}/forecast`} className={`city-cta${light ? " light" : ""}`}>
      실시간 16일 날씨 →
    </Link>
  );
}

/** 1~12월 카드. 여행하기 좋은 달은 색으로 표시한다 */
export function MonthCards({
  slug,
  normals,
  good,
  current,
  selected,
  onSelect,
  shoulder,
}: {
  slug: string;
  normals: MonthNormal[];
  good: GoodMonth[];
  current?: number;
  selected?: number;
  /** 있으면 페이지를 옮기지 않고 그 자리에서 달을 바꾼다 */
  onSelect?: (month: number) => void;
  /** 간절기인 달 (작게 표시) */
  shoulder?: number[];
}) {
  const goodMap = new Map(good.map((g) => [g.month, g]));
  return (
    <nav className="month-grid">
      {normals.map((m, i) => {
        const month = i + 1;
        const g = goodMap.get(month);
        const cls = ["month-card", g ? "good" : "", selected === month ? "on" : ""].filter(Boolean).join(" ");
        const inner = (
          <>
            <span className="mc-head">
              <b>{month}월</b>
              {g ? <em>{g.reason ?? "추천"}</em> : current === month ? <i>지금</i> : shoulder?.includes(month) ? <i className="mc-sh">간절기</i> : null}
            </span>
            <span className="mc-temp">
              <span className="t-hi">{Math.round(m.hi)}°</span> / <span className="t-lo">{Math.round(m.lo)}°</span>
            </span>
            <span className="mc-rain">💧 {m.rain}mm</span>
          </>
        );
        return onSelect ? (
          <button key={month} type="button" className={cls} aria-pressed={selected === month} onClick={() => onSelect(month)}>
            {inner}
          </button>
        ) : (
          <Link key={month} href={`/overseas/${slug}/${month}`} className={cls} aria-current={selected === month ? "page" : undefined}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}

/** 월별 기온(최고~최저 막대)과 강수량 막대 그래프. 누르면 그 달로 */
export function ClimateChart({
  slug,
  normals,
  selected,
  onSelect,
}: {
  slug: string;
  normals: MonthNormal[];
  selected?: number;
  onSelect?: (month: number) => void;
}) {
  const max = Math.max(...normals.map((m) => m.hi));
  const min = Math.min(...normals.map((m) => m.lo));
  const span = Math.max(1, max - min);
  const rainMax = Math.max(50, ...normals.map((m) => m.rain));
  const H = 110;
  return (
    <div className="cc">
      <div className="cc-cols">
        {normals.map((m, i) => {
          const month = i + 1;
          const top = ((max - m.hi) / span) * H;
          const height = Math.max(4, ((m.hi - m.lo) / span) * H);
          const cls = `cc-col${selected === month ? " on" : ""}`;
          const inner = (
            <>
              <span className="cc-temp" style={{ height: H + 36 }}>
                <span className="cc-hi" style={{ top }}>
                  {Math.round(m.hi)}°
                </span>
                <span className="cc-bar" style={{ top: top + 16, height }} />
                <span className="cc-lo" style={{ top: top + 18 + height }}>
                  {Math.round(m.lo)}°
                </span>
              </span>
              <span className="cc-rain">
                <span className="cc-rbar" style={{ height: `${(m.rain / rainMax) * 100}%` }} />
              </span>
              <span className="cc-mm">{m.rain}</span>
              <span className="cc-month">{month}월</span>
            </>
          );
          return onSelect ? (
            <button key={month} type="button" className={cls} aria-label={`${month}월`} aria-pressed={selected === month} onClick={() => onSelect(month)}>
              {inner}
            </button>
          ) : (
            <Link key={month} href={`/overseas/${slug}/${month}`} className={cls} aria-label={`${month}월`}>
              {inner}
            </Link>
          );
        })}
      </div>
      <p className="muted cc-legend">
        <span className="cc-key temp" /> 낮 최고~아침 최저 기온(°C) <span className="cc-key rain" /> 월 강수량(mm)
      </p>
    </div>
  );
}

/** 옷차림·주의할 점·준비물·좋은 점과 아쉬운 점 */
export function GuideCard({ title, guide, more }: { title: string; guide: MonthGuide; more?: React.ReactNode }) {
  return (
    <section className="card guide" style={{ marginTop: 12 }}>
      <h2 className="card-title">{title}</h2>
      <h3>👕 추천 옷차림</h3>
      <p>
        낮에는 <b>{guide.day}</b>
        {guide.night !== guide.day && (
          <>
            , 아침저녁에는 <b>{guide.night}</b>
          </>
        )}{" "}
        차림이 알맞아요.
      </p>
      {guide.cautions.length > 0 && (
        <>
          <h3>⚠️ 날씨 주의할 점</h3>
          <ul>
            {guide.cautions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      )}
      {guide.packing.length > 0 && (
        <>
          <h3>🎒 챙기면 좋은 것</h3>
          <div className="guide-chips">
            {guide.packing.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </>
      )}
      {(guide.good.length > 0 || guide.bad.length > 0) && (
        <div className="guide-pros">
          {guide.good.length > 0 && (
            <div className="pros">
              <h3>👍 좋은 점</h3>
              <p>{guide.good.join(", ")}</p>
            </div>
          )}
          {guide.bad.length > 0 && (
            <div className="cons">
              <h3>👎 아쉬운 점</h3>
              <p>{guide.bad.join(", ")}</p>
            </div>
          )}
        </div>
      )}
      {more}
    </section>
  );
}

/** 여행 준비: 예약·숙소·이동·비·보험 안내 */
export function TravelPrepCard({ title, items }: { title: string; items: PrepItem[] }) {
  return (
    <section className="card guide" style={{ marginTop: 12 }}>
      <h2 className="card-title">{title}</h2>
      {items.map((x) => (
        <div key={x.title}>
          <h3>
            {x.icon} {x.title}
          </h3>
          <p>{x.text}</p>
        </div>
      ))}
    </section>
  );
}
