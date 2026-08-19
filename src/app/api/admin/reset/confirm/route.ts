// 재설정 링크로 새 비밀번호를 정한다.
import { 재설정표_확인, 재설정표_쓰기완료 } from '@/lib/reset-token';
import { 비밀번호_바꾸기, 비밀번호_규칙, 비밀번호_안내 } from '@/lib/admin-password';
import { 시도_세기, 요청한_곳 } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(요청: Request) {
  const 곳 = 요청한_곳(요청);
  const 시도 = 시도_세기(곳, '로그인');
  if (시도.막힘) {
    return Response.json(
      { 메시지: `시도가 많습니다. ${시도.남은분}분 뒤에 다시 시도해 주세요.` },
      { status: 429 },
    );
  }

  let 표 = '';
  let 새것 = '';
  try {
    const 몸통 = await 요청.json();
    표 = String(몸통?.token ?? '');
    새것 = String(몸통?.next ?? '');
  } catch {
    return Response.json({ 메시지: '요청을 읽지 못했습니다.' }, { status: 400 });
  }

  if (!비밀번호_규칙.test(새것)) {
    return Response.json({ 메시지: 비밀번호_안내 }, { status: 400 });
  }

  const 확인 = await 재설정표_확인(표);
  if (!확인.좋음) {
    return Response.json({ 메시지: 확인.이유 }, { status: 400 });
  }

  try {
    await 비밀번호_바꾸기(새것);
    await 재설정표_쓰기완료();
  } catch {
    return Response.json(
      { 메시지: '비밀번호를 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요.' },
      { status: 503 },
    );
  }

  return Response.json({ 됨: true });
}
