import { withFlags } from "@/components/Flag";
import type { Metadata } from "next";
import Link from "next/link";
import { TextPage } from "@/components/TextPage";
import { GUIDES } from "@/data/guides";

export const metadata: Metadata = {
  title: "날씨 가이드 · 물때표·산 정상 체감온도·캠핑 바람, 예보 제대로 읽는 법",
  description:
    "물때표 읽는 법, 산 정상 기온 계산, 캠핑 바람 기준, 강수확률 뜻까지. 레저 날씨를 제대로 읽는 방법을 트립날씨가 정리했어요.",
  alternates: { canonical: "/guide" },
  openGraph: { siteName: "트립날씨", locale: "ko_KR", url: "/guide" },
};

export default function GuideIndex() {
  return (
    <TextPage title="날씨 가이드">
      <p>
        캠핑·낚시·등산·자전거·여행을 떠나기 전에 예보를 제대로 읽는 법을
        정리했어요. 트립날씨가 예보를 만드는 방식(세 모델의 중간값, 정상 고도
        보정, 물때, 예측 가능성)도 함께 설명해요.
      </p>
      <ul className="guide-list">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guide/${g.slug}`}>
              <b>{g.h1}</b>
            </Link>
            <br />
            <span className="muted">{withFlags(g.description)}</span>
          </li>
        ))}
      </ul>
    </TextPage>
  );
}
