/** 달 묶음 표기 (브라우저 화면에서도 쓰므로 평년값 자료를 끌어오지 않는 작은 파일로 둔다) */

/** [3,4,5,10,11] → "3~5월, 10~11월" (12월→1월로 이어지는 것도 한 묶음) */
export function monthRanges(list: number[]): string {
  const set = new Set(list);
  if (set.size === 12) return "1년 내내";
  if (!set.size) return "";
  // 비어 있는 달 다음부터 돌면 해를 넘기는 묶음도 끊기지 않는다
  let start = 1;
  while (set.has(start)) start++;
  const runs: number[][] = [];
  for (let k = 0; k < 12; k++) {
    const m = ((start - 1 + k) % 12) + 1;
    if (!set.has(m)) continue;
    const last = runs[runs.length - 1];
    const prev = ((m + 10) % 12) + 1;
    if (last && last[last.length - 1] === prev) last.push(m);
    else runs.push([m]);
  }
  runs.sort((a, b) => a[0] - b[0]);
  return runs.map((r) => (r.length === 1 ? `${r[0]}월` : `${r[0]}~${r[r.length - 1]}월`)).join(", ");
}
