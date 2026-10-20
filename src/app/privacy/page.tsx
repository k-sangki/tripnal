import type { Metadata } from "next";
import { CONTACT_EMAIL, TextPage } from "@/components/TextPage";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "tripnalc 개인정보처리방침",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <TextPage title="개인정보처리방침">
      <p>시행일: 2026년 10월 19일</p>
      <p>
        tripnalc(이하 &quot;서비스&quot;)는 회원가입 없이 이용할 수 있으며, 이름·전화번호·이메일 같은 개인정보를 수집하지 않습니다. 서비스 이용 과정에서
        처리되는 정보와 처리 방법은 다음과 같습니다.
      </p>

      <h2>1. 위치 정보</h2>
      <p>
        &quot;현재 위치&quot; 버튼을 누르고 브라우저의 위치 권한을 허용하면, 브라우저가 알려준 좌표를 그 위치의 날씨와 지역 이름을 조회하는 데에만
        사용합니다. 좌표는 서버에 저장하지 않으며, 권한은 언제든 브라우저 설정에서 철회할 수 있습니다.
      </p>

      <h2>2. 브라우저에 저장되는 정보</h2>
      <p>
        다음 방문 때 편하게 쓰실 수 있도록 마지막으로 본 장소와 레저 종류를 이용자의 브라우저(로컬 저장소)에만 저장합니다. 이 정보는 서버로 전송되지 않으며
        브라우저의 사이트 데이터 삭제로 지울 수 있습니다.
      </p>

      <h2>3. 외부 서비스</h2>
      <ul>
        <li>날씨 예보: Open-Meteo 등 예보 제공처에 좌표(약 1km 단위로 반올림)를 보내 예보를 받아옵니다.</li>
        <li>장소 검색·지도: 카카오(Kakao) 로컬·지도 API에 검색어와 좌표를 보냅니다. 검색 결과는 저장하지 않습니다.</li>
        <li>호스팅: Cloudflare가 서비스 보안과 운영을 위해 접속 기록(IP 주소, 브라우저 정보 등)을 처리할 수 있습니다.</li>
      </ul>

      <h2>4. 광고와 쿠키</h2>
      <p>
        서비스는 Google 애드센스 광고를 게재합니다. Google을 비롯한 제3자 광고 사업자는 쿠키를 사용해 이용자의 이전 방문 기록을 바탕으로 광고를 게재할 수
        있습니다. Google은 광고 쿠키를 사용해 이 사이트와 다른 사이트 방문 기록에 기반한 광고를 제공합니다. 맞춤 광고는{" "}
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
          Google 광고 설정
        </a>
        에서 끌 수 있고, 제3자 광고 쿠키는{" "}
        <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer">
          aboutads.info
        </a>
        에서 거부할 수 있습니다. 자세한 내용은{" "}
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
          Google의 파트너 사이트 데이터 사용 방식
        </a>
        을 참고하세요.
      </p>
      <p>
        방문 통계는 Cloudflare Web Analytics로 집계합니다. 쿠키를 쓰지 않고 개인을 식별하지 않으며, 페이지 조회 수·유입 경로·기기 종류 같은 합계만 봅니다.
      </p>

      <h2>5. 문의</h2>
      <p>
        개인정보 관련 문의는 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>로 보내주세요.
      </p>

      <h2>6. 변경</h2>
      <p>이 방침이 바뀌면 이 페이지에 시행일과 함께 알립니다.</p>
    </TextPage>
  );
}
