import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader, StripBanner } from "@/components/SiteHeader";
import { LEISURES } from "@/lib/leisure";
import { PLACES } from "@/lib/places";

export const metadata: Metadata = {
  title: "장소별 날씨 · 캠핑장·명산·물때표·해수욕장·스키장, 갈 곳은 날씨가 정해 줌",
  description: "캠핑장 날씨, 100대 명산 등산 날씨, 바다 물때표, 해수욕장·스키장·자전거길 인증센터 이번주·주말 날씨를 3시간 간격으로 확인하세요.",
  alternates: { canonical: "/weather" },
};

export default function PlacesIndex() {
  return (
    <div className="shell">
      <SiteHeader />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>장소별 이번주·16일 날씨</h1>
      <StripBanner href="/weekend" title="이번 주말 날씨 좋은 곳" cta="보기 →" />
      {LEISURES.map((l) => {
        const list = PLACES.filter((p) => p.leisure === l.id);
        if (!list.length) return null;
        // 골프장은 수가 많아 전국 골프장 날씨(/golf)로 보낸다
        if (l.id === "golf")
          return (
            <section key={l.id} className="card" style={{ marginTop: 12 }}>
              <h2 className="card-title">
                {l.emoji} {l.label}
              </h2>
              <nav className="place-links">
                <Link href="/golf">전국 골프장 날씨 ({list.length}곳) →</Link>
              </nav>
            </section>
          );
        return (
          <section key={l.id} className="card" style={{ marginTop: 12 }}>
            <h2 className="card-title">
              {l.emoji} {l.label}
            </h2>
            <nav className="place-links">
              {list.map((p) => (
                <Link key={p.slug} href={`/weather/${p.slug}`}>
                  {p.name} 날씨
                </Link>
              ))}
            </nav>
          </section>
        );
      })}
      <SiteFooter />
    </div>
  );
}
