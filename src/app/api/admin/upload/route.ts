// 채운 명단 엑셀을 받아 저장한다.
//
// **잘못된 줄이 하나라도 있으면 한 건도 저장하지 않는다.** (기획서 규칙)
// 그래서 검사를 전부 끝낸 뒤에야 저장을 시작한다.
// Design Ref: DESIGN.md 흐름 ②

import { 엑셀_읽기 } from '@/lib/excel';
import { 명단_검사, 영문_발급가능, 단위과제_이름 } from '@/lib/roster';
import { 저장소 } from '@/lib/store';
import { 담당자인가 } from '@/lib/session';

export const runtime = 'nodejs';

/** 올릴 수 있는 파일 크기 한도 (DESIGN.md 4-1) */
const 최대크기 = 10 * 1024 * 1024;

export async function POST(요청: Request) {
  if (!(await 담당자인가())) {
    return Response.json({ 메시지: '로그인이 필요합니다.' }, { status: 401 });
  }

  // ── 파일 꺼내기 ──────────────────────────────────────────────
  let 파일: File | null = null;
  try {
    const 폼 = await 요청.formData();
    // 필드 이름은 영문으로 둔다. HTTP 경계에서 한글 이름은 깨질 수 있다.
    const 값 = 폼.get('file');
    if (값 instanceof File) 파일 = 값;
  } catch {
    return Response.json({ 메시지: '파일을 읽지 못했습니다.' }, { status: 400 });
  }

  if (!파일) {
    return Response.json({ 메시지: '파일을 선택해 주세요.' }, { status: 400 });
  }
  if (!파일.name.toLowerCase().endsWith('.xlsx')) {
    return Response.json(
      { 메시지: '.xlsx 파일만 올릴 수 있습니다. 서식을 내려받아 사용해 주세요.' },
      { status: 400 },
    );
  }
  if (파일.size > 최대크기) {
    return Response.json(
      { 메시지: '파일이 너무 큽니다. 10MB 이하로 나눠서 올려 주세요.' },
      { status: 400 },
    );
  }

  // ── 1. 엑셀 읽기 (헤더 확인 + 예시 줄 건너뛰기) ───────────────
  let 읽음;
  try {
    읽음 = await 엑셀_읽기(await 파일.arrayBuffer());
  } catch {
    return Response.json(
      { 메시지: '엑셀 파일을 열지 못했습니다. 서식으로 만든 파일인지 확인해 주세요.' },
      { status: 400 },
    );
  }

  if (읽음.헤더문제) {
    return Response.json(
      { 메시지: `서식이 다릅니다. ${읽음.헤더문제}`, 오류들: [] },
      { status: 400 },
    );
  }

  if (읽음.줄들.length === 0) {
    return Response.json(
      { 메시지: '저장할 줄이 없습니다. 명단을 채워서 올려 주세요.', 오류들: [] },
      { status: 400 },
    );
  }

  // ── 2. 전부 검사. 하나라도 틀리면 여기서 끝낸다 ───────────────
  const 결과 = 명단_검사(읽음.줄들);
  if (!결과.통과) {
    return Response.json(
      {
        메시지: '저장하지 않았습니다.',
        오류들: 결과.오류들.slice(0, 50), // 너무 많으면 앞의 50개만
        오류_전체: 결과.오류들.length,
      },
      { status: 400 },
    );
  }

  // ── 3. 모두 통과했으니 한꺼번에 저장 ─────────────────────────
  let 저장;
  try {
    저장 = await 저장소().넣기(결과.줄들);
  } catch {
    return Response.json(
      { 메시지: '지금은 서비스를 이용할 수 없습니다. 잠시 뒤 다시 시도해 주세요.' },
      { status: 503 },
    );
  }

  // ── 4. 영문 수료증을 낼 수 없는 프로그램 알려주기 ────────────
  const 영문불가 = new Map<string, string>();
  for (const 줄 of 결과.줄들) {
    if (영문_발급가능(줄)) continue;
    const 열쇠 = `${줄.단위과제번호}-${줄.프로그램번호}`;
    영문불가.set(열쇠, `${열쇠} ${줄.프로그램명} (${단위과제_이름(줄.단위과제번호) ?? ''})`);
  }

  return Response.json({
    됨: true,
    처리: 결과.줄들.length,
    새로: 저장.새로,
    덮어씀: 저장.덮어씀,
    예시줄_건너뜀: 읽음.예시줄_건너뜀,
    영문불가: [...영문불가.values()],
  });
}
