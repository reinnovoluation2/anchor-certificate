// 명단 읽기·검증이 제대로 도는지 확인하는 시험 스크립트.
// 화면을 만들기 전에 함수만으로 먼저 확실히 해두기 위한 것.
// 실행: npx tsx scripts/check-roster.mts

import { readFile, writeFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
// 한글 이름 export는 묶음으로 가져와야 Node의 변환기가 놓치지 않는다.
import * as Excel from '@/lib/excel';
import * as Roster from '@/lib/roster';

// Node가 CJS로 바꾸면 내용이 default 안으로 들어간다. 둘 다 대응한다.
/* eslint-disable @typescript-eslint/no-explicit-any */
const E: any = (Excel as any).default ?? Excel;
const R: any = (Roster as any).default ?? Roster;

const { 엑셀_읽기, 빈_서식_만들기 } = E;
const { 명단_검사, 발급_관리번호, 영문_발급가능, 이름_맞추기 } = R;

let 실패 = 0;
function 확인(제목: string, 조건: boolean, 덧붙임 = '') {
  console.log(`${조건 ? 'O' : 'X'}  ${제목}${덧붙임 ? ' — ' + 덧붙임 : ''}`);
  if (!조건) 실패 += 1;
}

// ── 1. 진짜 합성 명단 파일 읽기 ────────────────────────────────
const 파일 = await readFile('합성_수료자명단_샘플_v2.xlsx');
const 읽음 = await 엑셀_읽기(파일.buffer.slice(파일.byteOffset,파일.byteOffset + 파일.byteLength) as ArrayBuffer);

확인('헤더가 서식과 같다', !읽음.헤더문제, 읽음.헤더문제 ?? '');
확인('31줄을 읽었다', 읽음.줄들.length === 31, `${읽음.줄들.length}줄`);

const 결과 = 명단_검사(읽음.줄들);
확인('검사를 통과했다', 결과.통과,
  결과.통과 ? '' : 결과.오류들.slice(0, 3).map((o) => `${o.줄번호}줄: ${o.메시지}`).join(' / '));

if (결과.통과) {
  const 줄들 = 결과.줄들;

  // ── 2. 앞의 0이 살아 있는가 (가장 자주 깨지는 곳) ────────────
  const 과제01 = 줄들.filter((r) => r.단위과제번호 === '01');
  확인('단위과제번호 01이 1로 바뀌지 않았다', 과제01.length === 8, `${과제01.length}건`);
  확인('프로그램번호도 두 자리다', 줄들.every((r) => /^\d{2}$/.test(r.프로그램번호)));

  // ── 3. 관리번호 ──────────────────────────────────────────────
  const 첫줄 = 줄들[0];
  확인('관리번호 형식이 맞다', 발급_관리번호(첫줄) === '2026-01-01', 발급_관리번호(첫줄));

  // ── 4. 영문명이 빈 프로그램 ──────────────────────────────────
  const 영문불가 = 줄들.filter((r) => !영문_발급가능(r));
  확인('영문 발급 불가가 3건이다 (데이터 분석 실무과정)', 영문불가.length === 3, `${영문불가.length}건`);
  확인('영문 불가는 모두 데이터 분석 실무과정이다',
    영문불가.every((r) => r.프로그램명 === '데이터 분석 실무과정'));

  // ── 5. 같은 학생이 두 프로그램 ───────────────────────────────
  const 김서준 = 줄들.filter((r) => r.학번 === '2021320014');
  확인('김서준이 두 프로그램을 수료했다', 김서준.length === 2, `${김서준.length}건`);

  // ── 6. 외국인 이름 공백 처리 ─────────────────────────────────
  확인('"응우옌 반 안" 공백을 무시하면 "응우옌반안"',
    이름_맞추기('응우옌 반 안') === '응우옌반안');
  확인('공백 없이 입력해도 같은 값이 된다',
    이름_맞추기('응우옌반안') === 이름_맞추기('응우옌 반 안'));
}

// ── 7. 잘못된 파일은 통째로 거부되는가 ─────────────────────────
{
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(파일.buffer.slice(파일.byteOffset, 파일.byteOffset + 파일.byteLength) as ArrayBuffer);
  const ws = wb.worksheets[0];
  ws.getRow(5).getCell(2).value = '04';        // 없는 단위과제번호
  ws.getRow(12).getCell(6).value = '';          // 학번 비움
  const 망가진 = Buffer.from(await wb.xlsx.writeBuffer());

  const 읽음2 = await 엑셀_읽기(망가진.buffer.slice(망가진.byteOffset, 망가진.byteOffset + 망가진.byteLength) as ArrayBuffer);
  const 결과2 = 명단_검사(읽음2.줄들);

  확인('잘못된 줄이 있으면 통째로 실패한다', !결과2.통과);
  if (!결과2.통과) {
    const 줄번호들 = 결과2.오류들.map((o) => o.줄번호);
    확인('5번째 줄을 짚어준다', 줄번호들.includes(5), 줄번호들.join(','));
    확인('12번째 줄을 짚어준다', 줄번호들.includes(12), 줄번호들.join(','));
    console.log('    안내 문구 예시:');
    for (const o of 결과2.오류들.slice(0, 3)) console.log(`      · ${o.줄번호}번째 줄 : ${o.메시지}`);
  }
}

// ── 8. 헤더가 다르면 거부되는가 ────────────────────────────────
{
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(파일.buffer.slice(파일.byteOffset, 파일.byteOffset + 파일.byteLength) as ArrayBuffer);
  wb.worksheets[0].getRow(1).getCell(9).value = '이메일'; // "고려대학교 이메일" 이어야 함
  const 다른헤더 = Buffer.from(await wb.xlsx.writeBuffer());
  const 읽음3 = await 엑셀_읽기(다른헤더.buffer.slice(다른헤더.byteOffset, 다른헤더.byteOffset + 다른헤더.byteLength) as ArrayBuffer);
  확인('헤더가 다르면 거부한다', Boolean(읽음3.헤더문제), 읽음3.헤더문제 ?? '');
}

// ── 9. 우리가 만든 빈 서식을 되읽을 수 있는가 ──────────────────
{
  const 서식 = await 빈_서식_만들기();
  await writeFile('trash-can/서식-확인용.xlsx', 서식);
  const 읽음4 = await 엑셀_읽기(서식.buffer.slice(서식.byteOffset, 서식.byteOffset + 서식.byteLength) as ArrayBuffer);
  확인('우리 서식의 헤더는 통과한다', !읽음4.헤더문제, 읽음4.헤더문제 ?? '');
  확인('예시 줄을 건너뛴다', 읽음4.예시줄_건너뜀);
  확인('예시 줄만 있으면 저장할 줄이 0개다', 읽음4.줄들.length === 0, `${읽음4.줄들.length}줄`);
}

console.log('');
console.log(실패 === 0 ? '모두 통과' : `${실패}건 실패`);
process.exit(실패 === 0 ? 0 : 1);
