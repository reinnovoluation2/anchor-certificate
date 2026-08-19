// 담당자 로그아웃. 로그인 표시를 지운다.
import { 담당자_로그인표시_지우기 } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  await 담당자_로그인표시_지우기();
  return Response.json({ 됨: true });
}
