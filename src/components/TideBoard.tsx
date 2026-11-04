"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { CaptureSheet } from "@/components/CaptureSheet";
import { withFlags } from "@/components/Flag";
import { InstallButton } from "@/components/InstallButton";
import { Logo } from "@/components/Logo";
import { SLOGAN_C } from "@/lib/brand";

/** 물때표 한 줄 (서버에서 필요한 값만 넘겨받는다) */
export interface TideItem {
  slug: string;
  name: string;
  region: string;
  high: string[];
  low: string[];
  wind: number | null;
  gust: number | null;
}

export interface TideSea {
  id: string;
  label: string;
  items: TideItem[];
}

export interface TideWeekDay {
  date: string;
  label: string;
  name: string;
  tone: string | null;
}

const windText = (x: TideItem) =>
  `${x.wind == null ? "바람 -" : `바람 ${Math.round(x.wind)}m/s`} · ${x.gust == null ? "돌풍 -" : `돌풍 ${Math.round(x.gust)}m/s`}`;

/**
 * 물때표 바다 고르기와 캡처 공유. 처음엔 전체를 보여 주고(검색 로봇도 전체를 본다),
 * 서해·남해·동해·제주를 누르면 그 바다만 남긴다. 같은 칩을 다시 누르면 전체로 돌아간다.
 */
export function TideBoard({ seas, week, dateText }: { seas: TideSea[]; week: TideWeekDay[]; dateText: string }) {
  const [pick, setPick] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const getTarget = useCallback(() => captureRef.current, []);
  const shown = pick ? seas.filter((s) => s.id === pick) : seas;
  const label = pick ? seas.find((s) => s.id === pick)?.label : null;

  return (
    <>
      <nav className="tf-chips tide-chips" aria-label="바다" style={{ marginTop: 12 }}>
        <button type="button" className={pick ? undefined : "on"} aria-pressed={!pick} onClick={() => setPick(null)}>
          전체
        </button>
        {seas.map((s) => (
          <button
            key={s.id}
            type="button"
            className={pick === s.id ? "on" : undefined}
            aria-pressed={pick === s.id}
            onClick={() => setPick(pick === s.id ? null : s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {shown.map((s) => (
        <section key={s.id} id={s.id} className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">
            🌊 {s.label} 물때표·바다날씨 ({s.items.length}곳)
          </h2>
          <ol className="wk-list">
            {s.items.map((x) => (
              <li key={x.slug}>
                <Link href={`/weather/${x.slug}`}>
                  <span className="wk-name">
                    <b>{x.name}</b>
                    <small>{x.region}</small>
                  </span>
                  <span className="wk-wx tide-times">
                    <span>
                      <i className="hi">만조</i> {x.high.join(" · ") || "-"}
                    </span>
                    <span>
                      <i className="lo">간조</i> {x.low.join(" · ") || "-"}
                    </span>
                    <small>{windText(x)}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {!capturing && (
        // 다른 페이지와 같은 자리·모양의 공유 버튼
        <div className="fab-bar">
          <InstallButton />
          <button className="fab" onClick={() => setCapturing(true)}>
            <i className="logo-dot" aria-hidden /> 캡처해서 공유
          </button>
        </div>
      )}
      {capturing && (
        <>
          <TideCapture frameRef={captureRef} seas={shown} week={week} dateText={dateText} label={label ?? null} />
          <CaptureSheet
            target={getTarget}
            fileName={`tripnalc_물때표_${label ?? "전국"}_${week[0]?.date ?? ""}.png`}
            shareUrl={`${window.location.origin}/tide`}
            onClose={() => setCapturing(false)}
          />
        </>
      )}
    </>
  );
}

/** 캡처 이미지: 오늘 물때·일주일 물때와 지금 보고 있는 바다의 만조·간조·바람을 화면 밖에 그린다 */
function TideCapture({
  frameRef,
  seas,
  week,
  dateText,
  label,
}: {
  frameRef: React.Ref<HTMLDivElement>;
  seas: TideSea[];
  week: TideWeekDay[];
  dateText: string;
  label: string | null;
}) {
  const [narrow] = useState(() => window.innerWidth < 600);
  const today = week[0];
  return (
    <div className="cf-host" aria-hidden>
      <div ref={frameRef} className={`cf tide-cf${narrow ? " narrow" : ""}`} style={{ width: narrow ? 420 : 760 }}>
        <header className="cf-head">
          <Logo dark size={narrow ? 22 : 28} />
          <div className="cf-title">
            <b>{label ? `${label} 물때표` : "전국 물때표"}</b>
            <span>{dateText}</span>
          </div>
        </header>
        {today && (
          <p className="city-cf-good">
            오늘은 <b className={`tide-cf-mul ${today.tone ?? ""}`}>{today.name}</b>
            {today.tone === "sari" ? " · 물살 센 사리" : today.tone === "jogeum" ? " · 물살 약한 조금" : ""}
          </p>
        )}
        <ol className="tide-week tide-cf-week">
          {week.map((d) => (
            <li key={d.date} className={d.tone ?? ""}>
              <small>{d.label}</small>
              <b>{d.name}</b>
            </li>
          ))}
        </ol>
        {seas.map((s) => (
          <div key={s.id} className="tide-cf-sea">
            {!label && <h3>{s.label}</h3>}
            <ol>
              {s.items.map((x) => (
                <li key={x.slug}>
                  <span className="tide-cf-name">
                    <b>{x.name}</b>
                    <small>{x.region}</small>
                  </span>
                  <span className="tide-cf-times">
                    <span>
                      <i className="hi">만조</i> {x.high.join(" · ") || "-"}
                    </span>
                    <span>
                      <i className="lo">간조</i> {x.low.join(" · ") || "-"}
                    </span>
                    <small>{windText(x)}</small>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
        <footer className="cf-foot">
          <span className="cf-src">
            만조·간조 : 국립해양조사원 · 바람 : {withFlags("ECMWF·GFS·ICON")}
          </span>
          <span className="cap-brand">
            <span className="cap-slogan">{SLOGAN_C}</span>
            <span className="cap-url">tripnalc.com</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
