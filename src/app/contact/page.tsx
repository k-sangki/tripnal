import type { Metadata } from "next";
import { CONTACT_EMAIL, TextPage } from "@/components/TextPage";

export const metadata: Metadata = {
  title: "문의하기",
  description: "tripnal 서비스 문의, 오류 제보, 장소 추가 요청, 광고·제휴 문의 안내.",
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  return (
    <TextPage title="문의하기">
      <p>tripnal에 대한 의견을 아래 이메일로 보내주세요. 보통 영업일 기준 3일 안에 답변드립니다.</p>
      <p style={{ fontSize: 18, fontWeight: 700 }}>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
      <ul>
        <li>예보나 화면 오류 제보 (가능하면 장소와 날짜, 캡처 이미지를 함께 보내주세요)</li>
        <li>캠핑장·산·낚시터 등 장소 추가 요청</li>
        <li>광고·제휴 문의</li>
      </ul>
    </TextPage>
  );
}
