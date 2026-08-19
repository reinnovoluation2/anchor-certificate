// 수료증 PDF를 만들어 내려준다. 직인은 **여기서만** 넣는다.
// Design Ref: DESIGN.md 흐름 ⑤

import { HTML을_PDF로 } from '@/lib/pdf';
import { 수료증_HTML, 수료증_파일이름, type 언어 } from '@/lib/certificate';
import { 수료증_줄_찾기 } from '@/lib/find-row';

export const runtime = 'nodejs';

export async function GET(요청: Request) {
  const 주소 = new URL(요청.url);
  const 관리번호 = 주소.searchParams.get('no') ?? '';
  const 언어: 언어 = 주소.searchParams.get('lang') === 'en' ? 'en' : 'ko';

  const 찾음 = await 수료증_줄_찾기(관리번호, 언어);
  if (!찾음.됨) {
    return Response.json({ 메시지: 찾음.메시지 }, { status: 찾음.상태 });
  }

  let pdf: Buffer;
  try {
    const html = await 수료증_HTML(찾음.줄, 언어, '실제');
    pdf = await HTML을_PDF로(html);
  } catch {
    return Response.json(
      { 메시지: '수료증을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요. 계속되면 사업단으로 문의해 주세요.' },
      { status: 500 },
    );
  }

  const 이름 = encodeURIComponent(수료증_파일이름(찾음.줄, 언어));
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${이름}`,
      // 개인정보가 담긴 문서다. 어디에도 남기지 않는다.
      'Cache-Control': 'no-store, private',
    },
  });
}
