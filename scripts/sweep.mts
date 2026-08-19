// PLAN 19번 — 합성 명단 31건 전체 흐름 훑기.
// 개발 서버가 떠 있어야 한다. 실행: npx tsx scripts/sweep.mts

import { readFile } from 'node:fs/promises';

const 서버 = 'http://localhost:3000';

let 실패 = 0;
function 확인(제목: string, 조건: boolean, 덧붙임 = '') {
  if (!조건) 실패 += 1;
  console.log(`${조건 ? 'O' : 'X'}  ${제목}${덧붙임 ? ' — ' + 덧붙임 : ''}`);
}

/** 쿠키를 들고 다니는 간단한 fetch */
function 손님() {
  let 쿠키 = '';
  return async (경로: string, 옵션: RequestInit = {}) => {
    const 응답 = await fetch(서버 + 경로, {
      ...옵션,
      headers: { ...(옵션.headers ?? {}), ...(쿠키 ? { Cookie: 쿠키 } : {}) },
      redirect: 'manual',
    });
    const 새쿠키 = 응답.headers.getSetCookie?.() ?? [];
    if (새쿠키.length) {
      쿠키 = 새쿠키.map((c) => c.split(';')[0]).join('; ');
    }
    return 응답;
  };
}

// ── 담당자로 명단 다시 올리기 ──────────────────────────────────
const 담당자 = 손님();
{
  const 응답 = await 담당자('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: process.env.ADMIN_ID, password: process.env.ADMIN_PASSWORD }),
  });
  확인('담당자 로그인', 응답.ok, `HTTP ${응답.status}`);

  const 파일 = await readFile('합성_수료자명단_샘플_v2.xlsx');
  const 폼 = new FormData();
  폼.append('file', new Blob([new Uint8Array(파일)]), '명단.xlsx');
  const 올림 = await 담당자('/api/admin/upload', { method: 'POST', body: 폼 });
  const 결과 = await 올림.json();
  확인('명단 31건 업로드', 올림.ok && 결과.처리 === 31, JSON.stringify(결과).slice(0, 90));
}

// ── 명단 전부를 읽어와 한 사람씩 확인 ──────────────────────────
const 명단: Array<Record<string, string>> = JSON.parse(
  await readFile('.data/roster.json', 'utf8'),
);
확인('저장된 명단이 31건', 명단.length === 31, `${명단.length}건`);

// 학번별로 묶는다
const 사람들 = new Map<string, Record<string, string>[]>();
for (const 줄 of 명단) {
  const 목록 = 사람들.get(줄.학번) ?? [];
  목록.push(줄);
  사람들.set(줄.학번, 목록);
}
console.log(`\n사람 ${사람들.size}명, 수료 기록 ${명단.length}건을 하나씩 확인합니다.\n`);

let 국문성공 = 0;
let 영문성공 = 0;
let 영문막힘 = 0;

for (const [학번, 줄들] of 사람들) {
  const 이름 = 줄들[0].국문_이름;
  const 학생 = 손님(); // 사람마다 새 손님 (출입증이 섞이지 않게)

  const 조회 = await 학생('/api/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: 학번, name: 이름 }),
  });

  if (!조회.ok) {
    확인(`${이름}(${학번}) 조회`, false, `HTTP ${조회.status}`);
    continue;
  }

  const 몸통 = await 조회.json();
  if (몸통.프로그램들.length !== 줄들.length) {
    확인(`${이름} 프로그램 개수`, false, `${몸통.프로그램들.length} ≠ ${줄들.length}`);
    continue;
  }

  for (const p of 몸통.프로그램들) {
    // 국문은 언제나 되어야 한다
    const 국문 = await 학생(`/api/certificate/pdf?no=${p.관리번호}&lang=ko`);
    if (국문.ok) 국문성공 += 1;
    else 확인(`${이름} ${p.프로그램명} 국문`, false, `HTTP ${국문.status}`);

    // 영문은 프로그램 영문명이 있을 때만
    const 영문 = await 학생(`/api/certificate/pdf?no=${p.관리번호}&lang=en`);
    if (p.영문가능) {
      if (영문.ok) 영문성공 += 1;
      else 확인(`${이름} ${p.프로그램명} 영문`, false, `HTTP ${영문.status}`);
    } else {
      if (영문.status === 400) 영문막힘 += 1;
      else 확인(`${이름} ${p.프로그램명} 영문이 막혀야 함`, false, `HTTP ${영문.status}`);
    }
  }
}

console.log('');
확인('국문 수료증 31건 모두 발급', 국문성공 === 31, `${국문성공}건`);
확인('영문 수료증 28건 발급', 영문성공 === 28, `${영문성공}건`);
확인('영문 불가 3건이 막힘', 영문막힘 === 3, `${영문막힘}건`);

console.log('');
console.log(실패 === 0 ? '전체 흐름 통과' : `${실패}건 실패`);
process.exit(실패 === 0 ? 0 : 1);
