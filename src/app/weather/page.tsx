import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { LEISURES } from "@/lib/leisure";
import { PLACES } from "@/lib/places";

export const metadata: Metadata = {
  title: "장소별 날씨 - 캠핑장·100대 명산·바다 물때표·해수욕장·스키장 이번주 날씨",
  description: "캠핑장 날씨, 100대 명산 등산 날씨, 바다 물때표, 해수욕장·스키장·자전거길 인증센터 날씨를 이번주부터 16일까지 3시간 간격으로 확인하세요.",
  alternates: { canonical: "/weather" },
};

export default function PlacesIndex() {
  return (
    <div className="shell">
      <SiteHeader />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>장소별 이번주·16일 날씨</h1>
      {LEISURES.map((l) => {
        const list = PLACES.filter((p) => p.leisure === l.id);
        if (!list.length) return null;
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
