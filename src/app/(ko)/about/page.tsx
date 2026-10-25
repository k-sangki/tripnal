import type { Metadata } from "next";
import { languageAlternates } from "@/lib/i18n";
import Link from "next/link";
import { CONTACT_EMAIL, TextPage } from "@/components/TextPage";

export const metadata: Metadata = {
  title: "트립날씨 소개",
  description: "tripnalc는 캠핑·낚시·등산·자전거·여행을 위한 대한민국 레저 날씨 서비스입니다.",
  alternates: { canonical: "/about", languages: languageAlternates("/about") },
};

export default function About() {
  return (
    <TextPage title="tripnalc 소개">
      <p>
        tripnalc(트립날씨)는 캠핑, 낚시, 등산, 자전거, 여행처럼 밖에서 즐기는 활동을 계획할 때 필요한 날씨를 한눈에 보여주는 서비스입니다. 대한민국 어디든
        오늘부터 최대 16일까지의 날씨를 3시간 간격으로 무료로 볼 수 있습니다.
      </p>
      <h2>무엇을 볼 수 있나요</h2>
      <ul>
        <li>기온과 체감온도, 강수량과 강수 확률, 구름, 풍속·풍향, 돌풍</li>
        <li>일출·일몰 시간과 지점의 해발 고도 (산 정상은 정상 고도로 기온을 보정)</li>
        <li>원하는 기간만 보기: 오늘, 3일, 이번 주말, 16일, 직접 선택</li>
        <li>바다 레저용 물때와 만조·간조 시각, 파고, 그리고 미세먼지·자외선·가시거리</li>
        <li>레저별로 중요한 정보를 위쪽에 크게 강조</li>
        <li>캡처 버튼으로 날씨 카드를 이미지로 저장하고 일행과 공유</li>
      </ul>
      <h2>예보 자료</h2>
      <p>
        tripnalc의 예보는 세계 기상기관의 수치예보모델 자료를 3시간 단위로 정리한 것입니다. 예보는 실제 날씨와 다를 수 있으며, 특히 먼 날짜일수록 오차가
        커집니다. 산행·출항·캠핑 전에는 기상청의 기상특보를 꼭 함께 확인해 주세요.
      </p>
      <p>기온·비·바람은 세 모델(ECMWF·GFS·ICON)의 중간값을 쓰고, 지점의 해발 고도에 맞춰 기온을 보정합니다. 사용한 자료와 출처는 다음과 같습니다.</p>
      <ul>
        <li>ECMWF 공개 예보 (IFS), CC BY 4.0 · © European Centre for Medium-Range Weather Forecasts</li>
        <li>미국 해양대기청(NOAA) GFS·GEFS·GFS-Wave 예보</li>
        <li>독일 기상청(DWD) ICON 예보</li>
        <li>Copernicus 대기 모니터링 서비스(CAMS) 미세먼지 예보 · Copernicus DEM 지형 고도 (© DLR e.V., Airbus Defence and Space GmbH, European Union)</li>
        <li>국립해양조사원 조석예보 (공공데이터포털)</li>
        <li>기상청 기상특보 (공공데이터포털)</li>
        <li>장소 위치(산 정상·해수욕장·자전거길 인증센터·캠핑장·스키장): © OpenStreetMap contributors (ODbL)</li>
        <li>해외 여행지 평년 월별 날씨: NASA POWER (NASA Langley Research Center, 2001~2020년 일별 자료로 계산)</li>
        <li>공유 미리보기 날씨 아이콘: Twemoji, CC BY 4.0</li>
      </ul>
      <h2>문의</h2>
      <p>
        잘못된 정보나 추가했으면 하는 장소가 있으면 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>로 알려주세요.{" "}
        <Link href="/contact">문의 안내</Link>
      </p>
    </TextPage>
  );
}
