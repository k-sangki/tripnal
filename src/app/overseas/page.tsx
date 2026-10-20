import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { DESTINATIONS, DESTINATION_GROUPS } from "@/lib/overseas";

export const metadata: Metadata = {
  title: "해외 날씨 - 일본·동남아·괌·유럽 해외여행 이번주·16일 날씨",
  description: "도쿄·오사카·후쿠오카, 다낭·나트랑·방콕·세부, 괌·사이판, 파리·로마 등 해외여행지 날씨를 현지 시간으로 16일까지 3시간 간격으로 확인하세요.",
  alternates: { canonical: "/overseas" },
};

export default function OverseasIndex() {
  return (
    <div className="shell">
      <SiteHeader />
      <h1 style={{ fontSize: 24, letterSpacing: "-0.03em" }}>해외여행 날씨 16일</h1>
      <p className="muted" style={{ margin: "4px 0 0" }}>
        여행지를 고르면 현지 시간으로 16일까지 날씨를 보여드립니다.
      </p>
      {DESTINATION_GROUPS.map((g) => (
        <section key={g} className="card" style={{ marginTop: 12 }}>
          <h2 className="card-title">{g}</h2>
          <nav className="place-links">
            {DESTINATIONS.filter((d) => d.group === g).map((d) => (
              <Link key={d.slug} href={`/overseas/${d.slug}`}>
                {d.name} 날씨
              </Link>
            ))}
          </nav>
        </section>
      ))}
      <SiteFooter />
    </div>
  );
}
