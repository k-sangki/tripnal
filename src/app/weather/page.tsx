import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { LEISURES } from "@/lib/leisure";
import { PLACES } from "@/lib/places";

export const metadata: Metadata = {
  title: "캠핑장·산·바다 장소별 16일 날씨",
  description: "자라섬 오토캠핑장, 설악산 대청봉, 태안 바다 등 레저 장소별로 오늘부터 16일까지 3시간 간격 날씨를 확인하세요.",
  alternates: { canonical: "/weather" },
};

export default function PlacesIndex() {
  return (
    <div className="shell">
      <SiteHeader />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>장소별 16일 날씨</h1>
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
