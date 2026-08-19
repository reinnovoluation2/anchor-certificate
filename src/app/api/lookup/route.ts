// 학생 조회. 학번과 이름이 **둘 다** 맞아야 한다.
// Design Ref: DESIGN.md 흐름 ③

import { 저장소 } from '@/lib/store';
import { 출입증_주기 } from '@/lib/session';
import { 시도_세기, 시도_지우기, 요청한_곳 } from '@/lib/rate-limit';
import { 발급_관리번호, 영문_발급가능, 단위과제_이름 } from '@/lib/roster';

export const runtime = 'nodejs';

/** 조회에 실패했을 때 보여줄 문구. 어느 항목이 틀렸는지는 알려주지 않는다. */
const 실패문구 = '입력하신 정보로 수료 내역을 찾을 수 없습니다. 학번과 이름을 확인해 주세요.';

export async function POST(요청: Request) {
  // 0. 너무 자주 시도하는지 먼저 본다
  const 곳 = 요청한_곳(요청);
  const 시도 = 시도_세기(곳);
  if (시도.막힘) {
    return Response.json(
      { 메시지: `조회 시도가 많습니다. ${시도.남은분}분 뒤에 다시 시도해 주세요.` },
      { status: 429 },
    );
  }

  let 학번 = '';
  let 이름 = '';
  try {
    const 몸통 = await 요청.json();
    학번 = String(몸통?.studentId ?? '').trim();
    이름 = String(몸통?.name ?? '').trim();
  } catch {
    return Response.json({ 메시지: '요청을 읽지 못했습니다.' }, { status: 400 });
  }

  if (!학번 || !이름) {
    return Response.json({ 메시지: '학번과 이름을 모두 입력해 주세요.' }, { status: 400 });
  }

  // 1~4. 명단에서 찾는다 (이름은 공백을 무시해 비교한다 — store.ts)
  let 줄들;
  try {
    줄들 = await 저장소().찾기(학번, 이름);
  } catch {
    return Response.json(
      { 메시지: '지금은 서비스를 이용할 수 없습니다. 잠시 뒤 다시 시도해 주세요.' },
      { status: 503 },
    );
  }

  if (줄들.length === 0) {
    return Response.json({ 메시지: 실패문구 }, { status: 404 });
  }

  // 5. 조회에 성공했으니 임시 출입증을 준다. 학번·이름이 주소창에 남지 않는다.
  await 출입증_주기(학번);
  시도_지우기(곳);

  // 그 학번이 실제로 수료한 프로그램만 내보낸다.
  // 같은 프로그램이라도 연도가 다르면 각각 따로 나온다.
  const 프로그램들 = 줄들
    .map((줄) => ({
      관리번호: 발급_관리번호(줄),
      해당연도: 줄.해당연도,
      단위과제번호: 줄.단위과제번호,
      단위과제명: 단위과제_이름(줄.단위과제번호) ?? '',
      프로그램번호: 줄.프로그램번호,
      프로그램명: 줄.프로그램명,
      영문가능: 영문_발급가능(줄),
    }))
    .sort((a, b) =>
      a.해당연도 === b.해당연도
        ? a.관리번호.localeCompare(b.관리번호)
        : b.해당연도.localeCompare(a.해당연도),
    );

  return Response.json({
    됨: true,
    이름: 줄들[0].국문_이름,
    프로그램들,
  });
}
