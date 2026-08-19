// 담당자 비밀번호 변경. 로그인한 상태에서만 된다.
//
// 지금 비밀번호를 다시 한 번 확인한다. 자리를 비운 사이 남이 바꾸지 못하게.

import { 담당자인가 } from '@/lib/session';
import {
  비밀번호_확인,
  비밀번호_바꾸기,
  비밀번호_규칙,
  비밀번호_안내,
} from '@/lib/admin-password';
import { 시도_세기, 시도_지우기, 요청한_곳 } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(요청: Request) {
  if (!(await 담당자인가())) {
    return Response.json({ 메시지: '로그인이 필요합니다.' }, { status: 401 });
  }

  // 지금 비밀번호를 넣어보는 것도 시도이므로 같이 센다
  const 곳 = 요청한_곳(요청);
  const 시도 = 시도_세기(곳, '로그인');
  if (시도.막힘) {
    return Response.json(
      { 메시지: `시도가 많습니다. ${시도.남은분}분 뒤에 다시 시도해 주세요.` },
      { status: 429 },
    );
  }

  let 지금것 = '';
  let 새것 = '';
  try {
    const 몸통 = await 요청.json();
    지금것 = String(몸통?.current ?? '');
    새것 = String(몸통?.next ?? '');
  } catch {
    return Response.json({ 메시지: '요청을 읽지 못했습니다.' }, { status: 400 });
  }

  if (!비밀번호_규칙.test(새것)) {
    return Response.json({ 메시지: 비밀번호_안내 }, { status: 400 });
  }

  if (지금것 === 새것) {
    return Response.json(
      { 메시지: '지금 쓰는 비밀번호와 다른 값으로 정해 주세요.' },
      { status: 400 },
    );
  }

  try {
    if (!(await 비밀번호_확인(지금것))) {
      return Response.json({ 메시지: '지금 비밀번호가 맞지 않습니다.' }, { status: 401 });
    }
    await 비밀번호_바꾸기(새것);
  } catch {
    return Response.json(
      { 메시지: '비밀번호를 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요.' },
      { status: 503 },
    );
  }

  시도_지우기(곳, '로그인');
  return Response.json({ 됨: true });
}
