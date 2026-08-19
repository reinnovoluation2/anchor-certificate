// 비밀번호 재설정 링크를 사업단 공용 메일로 보낸다.
//
// **화면에서 받을 주소를 입력받지 않는다.** 미리 정해둔 한 곳으로만 간다.
// 그래야 남이 링크를 가로챌 수 없다. (기획서 기능 1)

import { 재설정표_만들기 } from '@/lib/reset-token';
import { 메일_보내기, 사업단_메일주소, 메일_보낼수있나 } from '@/lib/mail';
import { 시도_세기, 요청한_곳 } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/** 주소를 가려서 보여준다. anchor@korea.ac.kr → an****@korea.ac.kr */
function 가린주소(주소: string): string {
  const [앞, 뒤] = 주소.split('@');
  if (!뒤) return '****';
  const 보일만큼 = Math.min(2, 앞.length);
  return `${앞.slice(0, 보일만큼)}${'*'.repeat(Math.max(3, 앞.length - 보일만큼))}@${뒤}`;
}

export async function POST(요청: Request) {
  // 메일 폭탄을 막는다. 로그인 시도와 같은 한도를 쓴다.
  const 곳 = 요청한_곳(요청);
  const 시도 = 시도_세기(곳, '로그인');
  if (시도.막힘) {
    return Response.json(
      { 메시지: `요청이 많습니다. ${시도.남은분}분 뒤에 다시 시도해 주세요.` },
      { status: 429 },
    );
  }

  const 주소 = 사업단_메일주소();
  if (!주소 || !메일_보낼수있나()) {
    return Response.json(
      {
        메시지:
          '메일 보내는 설정이 아직 끝나지 않았습니다. 사업단 서버 담당자에게 문의해 주세요.',
      },
      { status: 503 },
    );
  }

  let 표: string;
  try {
    표 = await 재설정표_만들기();
  } catch {
    return Response.json(
      { 메시지: '지금은 처리할 수 없습니다. 잠시 뒤 다시 시도해 주세요.' },
      { status: 503 },
    );
  }

  const 바탕주소 =
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(요청.url).origin);
  const 링크 = `${바탕주소}/admin/reset?token=${encodeURIComponent(표)}`;

  const 결과 = await 메일_보내기({
    받는사람: 주소,
    제목: '[ANCHOR 수료증] 담당자 비밀번호 재설정',
    본문글자: [
      'ANCHOR 수료증 발급 시스템 담당자 비밀번호 재설정 요청입니다.',
      '',
      '아래 주소로 들어가 새 비밀번호(숫자 네 자리)를 정해 주세요.',
      링크,
      '',
      '이 링크는 30분 동안, 한 번만 쓸 수 있습니다.',
      '요청하지 않으셨다면 이 메일을 무시하셔도 됩니다. 링크를 쓰지 않으면 비밀번호는 그대로입니다.',
    ].join('\n'),
    본문HTML: `
      <div style="font-family:'Malgun Gothic',sans-serif;color:#1a1a1a;line-height:1.7">
        <p>ANCHOR 수료증 발급 시스템 <strong>담당자 비밀번호 재설정</strong> 요청입니다.</p>
        <p>아래 단추를 눌러 새 비밀번호(숫자 네 자리)를 정해 주세요.</p>
        <p style="margin:24px 0">
          <a href="${링크}" style="background:#862633;color:#fff;padding:12px 20px;border-radius:4px;text-decoration:none">
            비밀번호 재설정
          </a>
        </p>
        <p style="font-size:13px;color:#555">
          이 링크는 <strong>30분 동안, 한 번만</strong> 쓸 수 있습니다.<br>
          요청하지 않으셨다면 이 메일을 무시하셔도 됩니다. 링크를 쓰지 않으면 비밀번호는 그대로입니다.
        </p>
        <p style="font-size:12px;color:#888;word-break:break-all">${링크}</p>
      </div>`,
  });

  if (!결과.됨) {
    return Response.json(
      { 메시지: '메일을 보내지 못했습니다. 사업단 서버 담당자에게 문의해 주세요.' },
      { status: 503 },
    );
  }

  return Response.json({ 됨: true, 보낸곳: 가린주소(주소) });
}
