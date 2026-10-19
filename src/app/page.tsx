import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { WeatherApp, type AppPlace } from "@/components/WeatherApp";
import { isInKorea } from "@/lib/weather";

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
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
      <WeatherApp initialPlace={place} initialLeisure={one(sp.act)} initialFrom={one(sp.from)} initialTo={one(sp.to)} />
      <SiteFooter />
    </div>
  );
}
