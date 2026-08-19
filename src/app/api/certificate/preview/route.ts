// 수료증 미리보기 HTML. PDF와 **같은 서식 파일**을 쓴다.
// 다만 직인은 넣지 않는다 — 이미지가 브라우저로 내려가면 위조에 쓰일 수 있다.

import { 수료증_HTML, type 언어 } from '@/lib/certificate';
import { 수료증_줄_찾기 } from '@/lib/find-row';

export const runtime = 'nodejs';

export async function GET(요청: Request) {
  const 주소 = new URL(요청.url);
  const 관리번호 = 주소.searchParams.get('no') ?? '';
  const 언어: 언어 = 주소.searchParams.get('lang') === 'en' ? 'en' : 'ko';

  const 찾음 = await 수료증_줄_찾기(관리번호, 언어);
  if (!찾음.됨) {
    return new Response(
      `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><style>
       body{font-family:"맑은 고딕","Malgun Gothic",sans-serif;padding:2rem;color:#862633;text-align:center}
       </style></head><body><p>${찾음.메시지}</p></body></html>`,
      { status: 찾음.상태, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  const html = await 수료증_HTML(찾음.줄, 언어, '자리만');
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, private',
    },
  });
}
