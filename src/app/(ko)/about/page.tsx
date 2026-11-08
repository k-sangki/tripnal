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
      <h2>예보를 만드는 방법</h2>
      <ul>
        <li>
          <strong>세 예보의 중간값</strong>: 유럽(ECMWF), 미국(GFS), 독일(ICON) 수치예보모델 자료를 직접 받아, 기온·비·바람마다 세 값 중 가운데 값을
          씁니다. 한 모델이 크게 빗나가도 결과가 덜 흔들립니다.
        </li>
        <li>
          <strong>고도 보정</strong>: 모델은 넓은 칸의 평균 높이로 기온을 계산하므로, 산 정상처럼 높은 곳은 실제보다 따뜻하게 나옵니다. 장소의 실제 해발
          고도에 맞춰 기온을 다시 계산합니다.
        </li>
        <li>
          <strong>예측 가능성(%)</strong>: 세 모델과 미국 앙상블 예보(GEFS)가 그날 날씨를 얼마나 비슷하게 내다보는지를 나타냅니다. 높을수록 예보가 덜
          바뀔 가능성이 크다는 뜻이며, 실제 적중률은 아닙니다.
        </li>
        <li>
          <strong>갱신</strong>: 예보는 하루 두 번 새로 계산합니다. 물때(몇 물)와 만조·간조 시각은 국립해양조사원 조석예보를 씁니다.
        </li>
        <li>
          <strong>다루는 곳</strong>: 명산·캠핑장·항구·해수욕장·도시·자전거길·스키장 등 국내 장소와 전국 골프장, 해외 여행지. 주소 검색으로 그 밖의 어느
          지점이든 볼 수 있습니다.
        </li>
      </ul>
      <p>사용한 자료와 출처는 다음과 같습니다.</p>
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
      <h2>운영 원칙</h2>
      <ul>
        <li>
          <strong>예보를 검증합니다</strong>: 2026년 10월부터 전국 기상청 종관기상관측소 97곳의 실제 관측값과 그 시각의 모델별 예보를 함께 기록하고
          있습니다. 자료가 쌓이면 모델별 오차를 분석해 보정과 가중치에 반영하고, 실제 적중률도 공개할 예정입니다.
        </li>
        <li>
          <strong>모르는 것은 보여주지 않습니다</strong>: 위성·재분석 자료가 부풀리는 해외 ‘비 온 날 수’처럼 믿기 어려운 값은 화면에 쓰지 않습니다.
        </li>
        <li>
          <strong>제보를 반영합니다</strong>: 장소 위치나 정보가 틀렸다는 제보는 확인 후 고칩니다.
        </li>
        <li>
          <strong>날씨를 읽는 법도 함께</strong>: 물때표, 산 정상 체감온도, 캠핑 바람 기준처럼 예보를 제대로 읽는 방법을{" "}
          <Link href="/guide">날씨 가이드</Link>에 정리했습니다.
        </li>
      </ul>
      <h2>업데이트 기록</h2>
      <ul>
        <li>2026년 11월: 날씨 가이드 12편, 물때표 바다별 보기·캡처, ‘가도 될까?’ 판정 카드</li>
        <li>2026년 10월 말: 물때표 모음, 단풍·첫눈·스키·김장 계절 날씨, 전국 골프장 날씨, 일본어·중국어 페이지, 명산 101곳 소개</li>
        <li>2026년 10월 중순: 세 모델 중간값 예보로 전환, 해외 여행지 234곳과 월별 평년 날씨, 기상특보 표시, 날씨 변화 알림</li>
        <li>2026년 10월: 서비스 시작</li>
      </ul>
      <h2>문의</h2>
      <p>
        잘못된 정보나 추가했으면 하는 장소가 있으면 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>로 알려주세요.{" "}
        <Link href="/contact">문의 안내</Link>
      </p>
    </TextPage>
  );
}
