import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { AD_SLOTS, AdSlot } from "@/components/AdSlot";
import { TextPage } from "@/components/TextPage";
import { GUIDES, getGuide, type GuideBlock } from "@/data/guides";
import { getPlace } from "@/lib/places";

export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/guide/[slug]">): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) return {};
  const url = `/guide/${g.slug}`;
  return {
    title: { absolute: g.title },
    description: g.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: "트립날씨",
      locale: "ko_KR",
      title: g.title,
      description: g.description,
      url,
    },
  };
}

function Block({ b }: { b: GuideBlock }) {
  if ("h" in b) return <h2>{b.h}</h2>;
  if ("p" in b) return <p>{b.p}</p>;
  if ("ul" in b)
    return (
      <ul>
        {b.ul.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    );
  if ("ol" in b)
    return (
      <ol>
        {b.ol.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ol>
    );
  if ("tip" in b) return <p className="guide-tip">💡 {b.tip}</p>;
  return (
    <div className="guide-table">
      <table>
        <thead>
          <tr>
            {b.table.head.map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.table.rows.map((r) => (
            <tr key={r.join("|")}>
              {r.map((x, i) => (
                <td key={i}>{x}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function GuidePage({
  params,
}: PageProps<"/guide/[slug]">) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  // 본문 가운데쯤 (두 번째 소제목 앞)에 광고 하나
  const mid = g.blocks.findIndex(
    (b, i) =>
      i > 0 &&
      "h" in b &&
      g.blocks.slice(0, i).filter((x) => "h" in x).length === 1,
  );
  const places = g.places.map((s) => getPlace(s)).filter((p) => p != null);
  const others = GUIDES.filter((x) => x.slug !== g.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: g.h1,
        description: g.description,
        datePublished: g.date,
        inLanguage: "ko",
        author: {
          "@type": "Organization",
          name: "트립날씨",
          url: "https://tripnalc.com/about",
        },
        publisher: {
          "@type": "Organization",
          name: "트립날씨",
          url: "https://tripnalc.com/",
        },
        mainEntityOfPage: `https://tripnalc.com/guide/${g.slug}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "트립날씨",
            item: "https://tripnalc.com/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "날씨 가이드",
            item: "https://tripnalc.com/guide",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: g.h1,
            item: `https://tripnalc.com/guide/${g.slug}`,
          },
        ],
      },
    ],
  };
  return (
    <TextPage title={g.h1}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="muted">
        <Link href="/guide">날씨 가이드</Link> · {g.date.replaceAll("-", ".")} ·
        트립날씨
      </p>
      {g.blocks.map((b, i) => (
        <Fragment key={i}>
          {i === mid && <AdSlot slot={AD_SLOTS.afterSummary} />}
          <Block b={b} />
        </Fragment>
      ))}
      {places.length > 0 && (
        <>
          <h2>이 글에 나온 곳 날씨</h2>
          <nav className="place-links">
            {places.map((p) => (
              <Link key={p.slug} href={`/weather/${p.slug}`}>
                {p.name} 날씨
              </Link>
            ))}
          </nav>
        </>
      )}
      <AdSlot slot={AD_SLOTS.bottom} />
      <h2>다른 가이드</h2>
      <ul>
        {others.map((x) => (
          <li key={x.slug}>
            <Link href={`/guide/${x.slug}`}>{x.h1}</Link>
          </li>
        ))}
      </ul>
    </TextPage>
  );
}
