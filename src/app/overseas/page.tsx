import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { DESTINATIONS, DESTINATION_GROUPS } from "@/lib/overseas";

export const metadata: Metadata = {
  title: "해외 날씨 - 일본·중국·동남아·괌·유럽·미주 해외여행 이번주·16일 날씨",
  description: "도쿄·오사카·후쿠오카, 상하이·타이베이, 다낭·방콕·세부, 괌·시드니, 파리·로마, 뉴욕·하와이 등 해외여행지 날씨를 현지 시간으로 16일까지 3시간 간격으로 확인하세요.",
  alternates: { canonical: "/overseas" },
};

export default function OverseasIndex() {
  return (
    <div className="shell">
      <SiteHeader />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>해외여행 날씨 16일</h1>
      <p className="muted" style={{ margin: "4px 0 0" }}>
        {DESTINATIONS.length}곳의 여행지 중 하나를 고르면 현지 시간으로 16일까지 날씨를 보여드립니다.
      </p>
      {DESTINATION_GROUPS.map((g) => (
        <section key={g} className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">{g}</h2>
          <nav className="ov-grid">
            {DESTINATIONS.filter((d) => d.group === g).map((d) => (
              <Link key={d.slug} href={`/overseas/${d.slug}`} className="ov-card" title={`${d.name} 날씨`}>
                <b>{d.name}</b>
                <span>
                  {d.country} · {d.en}
                </span>
              </Link>
            ))}
          </nav>
        </section>
      ))}
      <SiteFooter />
    </div>
  );
}
