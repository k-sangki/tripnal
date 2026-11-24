#!/usr/bin/env node
/**
 * 사이트맵 <lastmod>용 날짜를 git 기록에서 계산해 src/data/lastmod.json에 쓴다.
 *
 * 페이지마다 "그 페이지에만 있는 글·자료"가 마지막으로 바뀐 커밋 날짜를 쓴다.
 * - 장소(/weather/{slug}): 장소 목록·골프장 목록 항목, 소개 카드, 명산 해설·길잡이, 정상 평년값, 골프장 자료, 도시 평년값
 * - 골프장 시·도(/golf/{region}): 그 시·도 골프장들의 항목 중 가장 늦은 날짜와 페이지 파일 날짜
 * - 해외 도시(/overseas/{slug}): 도시 목록·소개·평년값·날씨 해설
 * - 가이드 글(/guide/{slug}): 그 글 항목
 * - 나머지(홈·목록·계절 페이지 등): 그 페이지 파일(page.tsx)이 마지막으로 바뀐 날짜
 * 모든 페이지 공통 틀(디자인·공통 문구)이 바뀐 것은 넣지 않는다. 매번 빌드 시각을 넣으면 구글이 값을 믿지 않는다.
 *
 * 자료 파일은 항목(장소 slug)별로 잘라 커밋마다 내용을 비교하므로, 한 파일에서 한 곳만 고치면 그곳만 날짜가 바뀐다.
 * 전체 git 기록이 필요하다 (deploy.yml checkout fetch-depth: 0). 얕은 복제면 아무것도 바꾸지 않고 끝낸다.
 *
 * 사용: node scripts/gen-lastmod.mjs
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const OUT = "src/data/lastmod.json";
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

if (git("rev-parse", "--is-shallow-repository").trim() === "true") {
  console.warn("gen-lastmod: 얕은 복제라 git 기록이 모자라 건너뜀 (저장된 lastmod.json 그대로 씀)");
  process.exit(0);
}

const read = (f) => readFileSync(f, "utf8");
const golf = JSON.parse(read("src/data/golf.json"));
const overseas = JSON.parse(read("src/data/overseas.json"));
const placeSlugs = [...read("src/lib/places.ts").matchAll(/slug:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
const guideSlugs = [...read("src/data/guides.ts").matchAll(/^\s+slug:\s*"([a-z0-9-]+)"/gm)].map((m) => m[1]);
const known = new Set([...placeSlugs, ...golf.map((g) => g.slug), ...overseas.map((d) => d.slug), ...guideSlugs]);

/** 자료 파일 한 판을 항목별 내용으로 자른다 */
function blocks(file, text) {
  const out = new Map();
  const add = (k, s) => out.set(k, (out.get(k) ?? "") + s);
  if (file.endsWith(".json")) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return out;
    }
    if (data && !Array.isArray(data) && data.places) data = data.places;
    if (Array.isArray(data)) for (const x of data) x?.slug && add(x.slug, JSON.stringify(x));
    else for (const [k, v] of Object.entries(data ?? {})) add(k, JSON.stringify(v));
    return out;
  }
  // TS 자료: `  "slug": {` · `  slug: {` · `slug: "slug"`가 나오는 줄부터 다음 항목 전까지
  let cur = null;
  for (const line of text.split("\n")) {
    const m = line.match(/^\s{2,4}(?:"([a-z0-9-]+)"|([a-z][a-z0-9-]*))\s*:\s*\{/) ?? line.match(/slug:\s*"([a-z0-9-]+)"/);
    const k = m && (m[1] ?? m[2]);
    if (k && known.has(k)) cur = k;
    if (cur) add(cur, line.trim() + "\n");
  }
  return out;
}

/** 파일의 항목별 마지막 변경 날짜 */
function keyDates(file) {
  const log = git("log", "--reverse", "--format=%H %cI", "--", file).trim();
  const last = new Map();
  const hash = new Map();
  for (const row of log ? log.split("\n") : []) {
    const [sha, date] = row.split(" ");
    let text;
    try {
      text = git("show", `${sha}:${file}`);
    } catch {
      continue; // 지운 커밋
    }
    for (const [k, v] of blocks(file, text)) {
      const h = createHash("sha1").update(v.replace(/\s+/g, " ")).digest("hex");
      if (hash.get(k) !== h) {
        hash.set(k, h);
        last.set(k, date);
      }
    }
  }
  return last;
}

/** 파일 자체가 마지막으로 바뀐 날짜 */
const fileDate = (file) => git("log", "-1", "--format=%cI", "--", file).trim() || null;
const latest = (...ds) => ds.filter(Boolean).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1) ?? null;

const placeFiles = [
  "src/lib/places.ts",
  "src/data/golf.json",
  "src/data/place-intro.ts",
  "src/data/mountain-intro.ts",
  "src/data/mountain-climate.json",
  "src/data/golf-facts.json",
  "src/data/climate-kr.json",
];
const overseasFiles = ["src/data/overseas.json", "src/data/overseas-intro.json", "src/data/climate.json", "src/data/overseas-guide.ts"];
const perKey = (files) => {
  const maps = files.map(keyDates);
  return (k) => latest(...maps.map((m) => m.get(k)));
};
const placeDate = perKey(placeFiles);
const overseasDate = perKey(overseasFiles);
const guideDate = perKey(["src/data/guides.ts"]);

const page = (p) => fileDate(`src/app/(ko)${p}/page.tsx`);
const out = {};
for (const p of ["", "/weather", "/overseas", "/weekend", "/tide", "/golf", "/guide", "/about", "/privacy", "/contact", "/autumn-foliage", "/first-snow", "/ski", "/kimjang"]) {
  out[p || "/"] = page(p);
}
const monthPage = page("/overseas/month/[month]");
for (let m = 1; m <= 12; m++) out[`/overseas/month/${m}`] = monthPage;
for (const s of guideSlugs) out[`/guide/${s}`] = guideDate(s);
out["/guide"] = latest(out["/guide"], ...guideSlugs.map(guideDate));
for (const s of [...placeSlugs, ...golf.map((g) => g.slug)]) out[`/weather/${s}`] = placeDate(s);
for (const d of overseas) out[`/overseas/${d.slug}`] = overseasDate(d.slug);

// 골프장 시·도: 그 시·도 골프장 항목 중 가장 늦은 날짜 (src/lib/golf.ts와 같은 규칙: region 앞 글자)
const regions = [...read("src/lib/golf.ts").matchAll(/\{ slug: "([a-z]+)", short: "([^"]+)"/g)].map((m) => ({ slug: m[1], short: m[2] }));
const regionPage = page("/golf/[region]");
for (const r of regions) {
  const courses = golf.filter((g) => g.region.startsWith(r.short));
  if (courses.length) out[`/golf/${r.slug}`] = latest(regionPage, ...courses.map((g) => placeDate(g.slug)));
}

const sorted = Object.fromEntries(Object.entries(out).filter(([, v]) => v).sort(([a], [b]) => (a < b ? -1 : 1)));
writeFileSync(OUT, JSON.stringify(sorted, null, 0).replace(/","/g, '",\n"').replace(/^\{/, "{\n").replace(/\}$/, "\n}\n"));
const missing = Object.entries(out).filter(([, v]) => !v).map(([k]) => k);
console.log(`gen-lastmod: ${Object.keys(sorted).length}곳${missing.length ? `, 날짜 없음 ${missing.length}: ${missing.slice(0, 5).join(" ")}` : ""}`);
