import type { MountainGuide } from "@/data/mountain-intro";
import type { MountainMonthRow } from "@/lib/mountainMonths";

const SEASONS = [
  { k: "봄", icon: "🌸" },
  { k: "여름", icon: "☀️" },
  { k: "가을", icon: "🍁" },
  { k: "겨울", icon: "❄️" },
];

/** 명산 산행 길잡이: 코스·계절·월별 표·일출·가는 길·대피소를 칸과 표로 한눈에 */
export default function MountainGuideCard({
  name,
  elevation,
  guide,
  months,
  thisMonth,
}: {
  name: string;
  elevation: number;
  guide: MountainGuide;
  months: MountainMonthRow[] | null;
  thisMonth: number;
}) {
  return (
    <section className="card seo-text mtn-guide" style={{ marginTop: 12 }}>
      <h2>{name} 산행 길잡이</h2>

      <h3>🥾 나에게 맞는 코스</h3>
      <div className="mg-grid">
        {guide.courses.map((c) => (
          <div key={c.name} className="mg-tile">
            <span className="mg-tag">{c.who}</span>
            <b>{c.name}</b>
            <small>{c.note}</small>
          </div>
        ))}
      </div>

      <h3>🗓️ 언제 가면 좋을까</h3>
      <div className="mg-grid">
        {guide.seasons.map((s, i) => (
          <div key={SEASONS[i].k} className="mg-tile">
            <b>
              <span aria-hidden>{SEASONS[i].icon}</span> {SEASONS[i].k}
            </b>
            <small>{s.see}</small>
            <small className="mg-warn">⚠ {s.watch}</small>
          </div>
        ))}
      </div>

      {months && (
        <>
          <h3>🌡️ 월별 정상 일출·기온·옷차림</h3>
          <table className="km-table mtn-months">
            <thead>
              <tr>
                <th>월</th>
                <th>일출</th>
                <th>새벽 / 한낮</th>
                <th>비</th>
                <th>옷차림</th>
              </tr>
            </thead>
            <tbody>
              {months.map((r) => (
                <tr key={r.m} className={r.m === thisMonth ? "on" : undefined}>
                  <td>{r.m}월</td>
                  <td>{r.sunrise}</td>
                  <td>
                    <span className="v-lo">{r.lo}°</span> / <span className="v-hi">{r.hi}°</span>
                  </td>
                  <td>{r.rain}</td>
                  <td className="wear">
                    {r.wear}
                    {r.crampon && <span className="mg-cramp">아이젠</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sum-note">
            일출은 매달 15일 정상 기준 계산값, 기온·비(mm)는 NASA POWER 평년값을 해발 {elevation.toLocaleString()}m로 보정한 값이에요. 바람이 불면 체감은 훨씬 낮아요.
          </p>
        </>
      )}

      <h3>🌅 일출 보러 간다면</h3>
      <ul className="mg-check">
        {guide.sunrise.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <h3>🚌 가는 길</h3>
      <table className="km-table mg-access">
        <thead>
          <tr>
            <th>들머리</th>
            <th>대중교통</th>
            <th>차</th>
          </tr>
        </thead>
        <tbody>
          {guide.access.map((a) => (
            <tr key={a.name}>
              <td>
                <b>{a.name}</b>
              </td>
              <td>{a.bus}</td>
              <td>{a.car}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {guide.accessTip && <p className="sum-note">💡 {guide.accessTip}</p>}

      <h3>🏠 대피소·통제</h3>
      <div className="mg-chips">
        {guide.shelters.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
      <ul className="mg-check">
        {guide.rules.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}
