import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, TextPage } from "@/components/TextPage";

export const metadata: Metadata = {
  title: "소개",
  description: "tripnal은 캠핑·낚시·등산·자전거·여행을 위한 대한민국 16일 날씨 서비스입니다.",
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <TextPage title="tripnal 소개">
      <p>
        tripnal(트립널)은 캠핑, 낚시, 등산, 자전거, 여행처럼 밖에서 즐기는 활동을 계획할 때 필요한 날씨를 한눈에 보여주는 서비스입니다. 대한민국 어디든
        오늘부터 최대 16일까지의 날씨를 3시간 간격으로 무료로 볼 수 있습니다.
      </p>
      <h2>무엇을 볼 수 있나요</h2>
      <ul>
        <li>기온과 체감온도, 강수량과 강수 확률, 구름, 풍속·풍향, 돌풍</li>
        <li>일출·일몰 시간과 지점의 해발 고도 (산 정상은 정상 고도로 기온을 보정)</li>
        <li>원하는 기간만 보기: 오늘, 3일, 이번 주말, 7일, 16일 전체, 직접 선택</li>
        <li>레저별로 중요한 정보를 크게 강조하고, 날짜마다 좋음·보통·나쁨을 알려주는 적합도</li>
        <li>캡처 버튼으로 날씨 카드를 이미지로 저장하고 일행과 공유</li>
      </ul>
      <h2>예보 자료</h2>
      <p>
        tripnal의 예보는 세계 기상기관의 수치예보모델 자료를 3시간 단위로 정리한 것입니다. 예보는 실제 날씨와 다를 수 있으며, 특히 먼 날짜일수록 오차가
        커집니다. 산행·출항·캠핑 전에는 기상청의 기상특보를 꼭 함께 확인해 주세요.
      </p>
      <h2>문의</h2>
      <p>
        잘못된 정보나 추가했으면 하는 장소가 있으면 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>로 알려주세요.{" "}
        <Link href="/contact">문의 안내</Link>
      </p>
    </TextPage>
  );
}
