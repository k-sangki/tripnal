import type { Metadata } from "next";
import { OverseasFinder, toParams } from "@/components/OverseasFinder";
import { localMonth } from "@/lib/climate";
import { KST_OFFSET_MIN } from "@/lib/time";

export const metadata: Metadata = {
  title: "해외 날씨·여행지 찾기 - 일본·동남아·유럽 해외여행 월별·16일 날씨와 가기 좋은 달",
  description:
    "도쿄·오사카, 타이베이, 다낭·방콕·세부, 괌·시드니, 파리·로마, 뉴욕·하와이 등 해외 여행지를 날씨 좋은 때·간절기·비수기, 지역, 비행시간으로 골라 보고 월별 평년 날씨와 현지 시간 16일 날씨를 확인하세요.",
  alternates: { canonical: "/overseas" },
};

/** 이번 달이 미리 골라지도록 요청 때 그린다 */
export const dynamic = "force-dynamic";

export default async function OverseasIndex({ searchParams }: PageProps<"/overseas">) {
  return <OverseasFinder month={localMonth(KST_OFFSET_MIN)} sp={await toParams(searchParams)} />;
}
