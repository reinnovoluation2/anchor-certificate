// 담당자 로그인. .env 의 값과 맞는지만 본다.
//
// 시도 횟수를 제한한다. 공용 계정 하나뿐이고 비밀번호가 짧을 수 있어,
// 이 제한이 사실상 유일한 방어선이다.

import { 담당자_확인, 담당자_로그인표시_심기 } from '@/lib/session';
import { 시도_세기, 시도_지우기, 요청한_곳 } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(요청: Request) {
  const 곳 = 요청한_곳(요청);
  const 시도 = 시도_세기(곳, '로그인');
  if (시도.막힘) {
    return Response.json(
      { 메시지: `로그인 시도가 많습니다. ${시도.남은분}분 뒤에 다시 시도해 주세요.` },
      { status: 429 },
    );
  }

  let 아이디 = '';
  let 비밀번호 = '';
  try {
    const 몸통 = await 요청.json();
    아이디 = String(몸통?.id ?? '');
    비밀번호 = String(몸통?.password ?? '');
  } catch {
    return Response.json({ 메시지: '요청을 읽지 못했습니다.' }, { status: 400 });
  }

  try {
    if (!(await 담당자_확인(아이디, 비밀번호))) {
      // 어느 쪽이 틀렸는지는 알려주지 않는다.
      return Response.json({ 메시지: '아이디 또는 비밀번호가 맞지 않습니다.' }, { status: 401 });
    }
  } catch {
    // .env 값이 없는 경우. 값 자체는 절대 화면에 내보내지 않는다.
    return Response.json(
      { 메시지: '서버 설정이 끝나지 않았습니다. 관리자에게 문의해 주세요.' },
      { status: 500 },
    );
  }

  await 담당자_로그인표시_심기();
  시도_지우기(곳, '로그인');
  return Response.json({ 됨: true });
}
