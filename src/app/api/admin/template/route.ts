// 빈 명단 서식(.xlsx)을 내려준다. 로그인해야 받을 수 있다.
// Design Ref: DESIGN.md 흐름 ①
import { 빈_서식_만들기 } from '@/lib/excel';
import { 담당자인가 } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await 담당자인가())) {
    return Response.json({ 메시지: '로그인이 필요합니다.' }, { status: 401 });
  }

  const 파일 = await 빈_서식_만들기();
  const 이름 = encodeURIComponent('ANCHOR_수료자명단_서식.xlsx');

  return new Response(new Uint8Array(파일), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${이름}`,
    },
  });
}
