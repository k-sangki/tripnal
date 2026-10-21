import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bestNames, OverseasFinder, toParams } from "@/components/OverseasFinder";

/** 평년값만 쓰므로 요청 때 그려도 가볍다 */
export const dynamic = "force-dynamic";

function parse(month: string) {
  return /^(?:[1-9]|1[0-2])$/.test(month) ? Number(month) : null;
}

export async function generateMetadata({ params }: PageProps<"/overseas/month/[month]">): Promise<Metadata> {
  const m = parse((await params).month);
  if (!m) return {};
  const title = `${m}월 해외여행 추천 · ${m}월에 가기 좋은 해외 여행지와 날씨`;
  const description = `${m}월에 날씨가 좋은 해외 여행지를 지역별로 모았어요. ${bestNames(m).join("·")} 등 평년 기온·강수량과 옷차림, 우기·건기와 항공권이 저렴한 간절기·비수기 여행지까지 보고 ${m}월 해외여행 일정을 계획하세요.`;
  const url = `/overseas/month/${m}`;
  return {
    title,
    description,
    keywords: [`${m}월 해외여행`, `${m}월 해외여행 추천`, `${m}월 여행지 추천`, `${m}월에 가기 좋은 나라`, `${m}월 간절기 여행지`, `${m}월 비수기 해외여행`],
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function BestMonthPage({ params, searchParams }: PageProps<"/overseas/month/[month]">) {
  const m = parse((await params).month);
  if (!m) notFound();
  return <OverseasFinder month={m} sp={await toParams(searchParams)} />;
}
