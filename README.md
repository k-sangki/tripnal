# tripnalc (트립날씨)

캠핑·낚시·등산·사이클·여행을 위한 대한민국 16일 날씨 (3시간 간격). https://tripnalc.com

## 기능

- 현재 위치(GPS) 또는 주소·장소 검색, 카카오맵에서 위치 선택
- 오늘부터 최대 16일 예보를 표 하나에 담아 좌우로 넘겨 봄. 간격은 일·12h·6h·3h, 날짜 구분선·낮밤 색·바람 세기 색 표시: 기온, 체감온도, 강수(확률), 구름, 풍속·풍향, 돌풍, 일출·일몰, 지점 고도
- 기간 선택: 오늘 / 3일 / 이번 주말 / 7일 / 16일 전체 / 직접 선택(16일 버튼에서 시작·끝을 차례로 누름)
- 활동별 화면: 23개 활동을 7개 그룹으로 묶고, 그룹마다 주로 봐야 할 지표(파고·조석·낙뢰·노면·일교차·결빙·적설·가시거리·미세먼지·자외선·기류 등)를 표 맨 위로 올림. 좋음·나쁨 같은 판정은 하지 않음
- 캡처 버튼: 선택한 모든 날을 화면 한 장(휴대폰은 기기 화면, PC는 모니터 비율)에 맞춘 이미지로 저장·공유. 우하단 `tripnalc.com` 워터마크(휴대폰 공유창, 네이버 블로그·카페, 링크)
- 장소별 검색 노출 페이지: `/weather/{slug}` (예: `/weather/jarasum-autocamp`), sitemap, 구조화 데이터
- 애드센스 슬롯(예보 아래, PC 사이드, 하단). 캡처 이미지에는 광고가 들어가지 않음

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
4. `npm run deploy` → `wrangler.jsonc`의 routes로 tripnalc.com, www.tripnalc.com(그리고 예전 주소 tripnal.com·www, tripnalc.com으로 영구 이동)에 연결

## 데이터 출처·라이선스

- 개발 중: [Open-Meteo](https://open-meteo.com) 무료 API (비상업용). 애드센스를 붙여 공개하기 전에 유료 키 또는 직접 수집으로 전환해야 한다.
- 검색·지도: 카카오 로컬·지도 API. 검색 결과는 약관상 저장하지 않는다.

## 예보 직접 수집 (진행 중)

`collector/`는 ECMWF IFS 공개 예보(0.25°, CC-BY-4.0)에서 한국 영역(북위 32.5~39.5, 동경 124~132)만 잘라 격자점별 JSON으로 만들고 R2 `tripnal-data` 버킷에 올립니다. `.github/workflows/collect.yml`이 하루 두 번(00·12 UTC run) 돌고, 수동으로도 실행할 수 있습니다. `collector/gfs.py`는 같은 방식으로 NOAA GFS(0.25°, 3시간 간격 384시간, 시정 포함)를 받아 `gfs/`에 올리고, `collector/icon.py`는 독일 기상청 ICON 전지구(약 13km, 3시간 간격 180시간)를 가장 가까운 격자 칸으로 뽑아 `icon/`에 올립니다. 화면에 쓰기 전까지는 Open-Meteo 예보를 그대로 씁니다.
