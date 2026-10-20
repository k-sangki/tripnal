import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { WeatherApp, type AppPlace } from "@/components/WeatherApp";
import { getLeisure } from "@/lib/leisure";
import { clampPeriod, periodLabel } from "@/lib/period";
import { kstDate } from "@/lib/time";
import { isInKorea } from "@/lib/weather";

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

/** 공유 링크(장소·기간이 붙은 주소)는 카카오톡 등에서 그 장소·기간 날씨가 미리보기로 보이게 한다 */
export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const sp = await searchParams;
  const lat = Number(one(sp.lat));
  const lon = Number(one(sp.lon));
  if (!one(sp.lat) || !Number.isFinite(lat) || !Number.isFinite(lon) || !isInKorea(lat, lon)) return {};
  const name = one(sp.name)?.slice(0, 40) || "선택한 위치";
  const leisure = getLeisure(one(sp.act));
  const period = clampPeriod(one(sp.from), one(sp.to), kstDate());
  const title = `${name} ${leisure.label} 날씨`;
  const description = `${periodLabel(period)} ${name} 날씨를 3시간 간격으로 확인하세요.`;
  const image = `/api/og?${new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4), name, act: leisure.id, from: period.from, to: period.to })}`;
  return {
    title,
    description,
    // 같은 장소라도 기간마다 다른 화면이라 검색에는 기본 주소만 남긴다
    alternates: { canonical: "/" },
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const lat = Number(one(sp.lat));
  const lon = Number(one(sp.lon));
  const place: AppPlace | null =
    Number.isFinite(lat) && Number.isFinite(lon) && isInKorea(lat, lon) && one(sp.lat)
      ? { name: one(sp.name)?.slice(0, 40) || "선택한 위치", lat, lon }
      : null;

  return (
    <div className="shell">
      <SiteHeader />
      <WeatherApp initialPlace={place} initialLeisure={one(sp.act)} initialFrom={one(sp.from)} initialTo={one(sp.to)} initialInterval={one(sp.int)} />
      <SiteFooter />
    </div>
  );
}
