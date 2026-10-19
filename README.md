# tripnal

캠핑·낚시·등산·사이클·여행을 위한 대한민국 16일 날씨 (3시간 간격). https://tripnal.com

## 기능

- 현재 위치(GPS) 또는 주소·장소 검색, 카카오맵에서 위치 선택
- 오늘부터 최대 16일, 3시간 간격 카드형 예보: 기온, 체감온도, 강수(확률), 구름, 풍속·풍향, 돌풍, 일출·일몰, 지점 고도
- 기간 선택: 오늘 / 3일 / 이번 주말 / 7일 / 16일 전체 / 직접 선택(예: 2박 3일)
- 레저별 화면: 중요한 지표를 크게 강조하고, 날짜별 적합도(좋음·보통·나쁨)와 가장 좋은 날을 알려줌
- 캡처 버튼: 우하단 `tripnal.com` 워터마크가 들어간 브랜드 이미지로 저장·공유(휴대폰 공유창, 네이버 블로그·카페, 링크)
- 장소별 검색 노출 페이지: `/weather/{slug}` (예: `/weather/jarasum-autocamp`), sitemap, 구조화 데이터
- 애드센스 슬롯(요약 아래, 일별 카드 4개마다, PC 사이드, 하단). 캡처 이미지에는 광고가 들어가지 않음

## 개발

```bash
npm install
cp .env.example .env.local   # 키 입력
npm run dev                  # Open-Meteo 실데이터
npm run dev:mock             # 외부 API 없이 가짜 예보로 화면 확인
npm test && npm run lint && npm run typecheck
```

## 구조

- `src/lib/weather/` 예보 데이터 계층. provider(`openMeteo.ts`, `mock.ts`)가 시간 단위 자료를 주면 `aggregate.ts`가 3시간·날짜별로 묶는다.
  공개 전에 ECMWF·GFS 직접 수집 provider를 추가하고 `WEATHER_PROVIDER`만 바꾸면 된다.
- `src/lib/leisure.ts` 레저별 강조 지표와 적합도 규칙
- `src/lib/places.ts` 장소 페이지 목록(시드). `src/lib/seo.ts` 제목·설명·요약 문장
- `src/components/` 화면 (모바일 우선, 1024px 이상에서 2단)

## 배포 (Cloudflare Workers)

1. `npx wrangler login`
2. 서버 키 등록: `npx wrangler secret put KAKAO_REST_API_KEY` (공개 후 `OPEN_METEO_API_KEY`도)
3. 브라우저용 키(`NEXT_PUBLIC_*`)는 빌드 시점에 필요하므로 `.env.production`에 넣는다
4. `npm run deploy` → `wrangler.jsonc`의 routes로 tripnal.com, www.tripnal.com에 연결

## 데이터 출처·라이선스

- 개발 중: [Open-Meteo](https://open-meteo.com) 무료 API (비상업용). 애드센스를 붙여 공개하기 전에 유료 키 또는 직접 수집으로 전환해야 한다.
- 검색·지도: 카카오 로컬·지도 API. 검색 결과는 약관상 저장하지 않는다.
