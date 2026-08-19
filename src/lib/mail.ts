// 메일을 보낸다.
//
// 두 가지 방법을 지원한다. .env 에 있는 값을 보고 스스로 고른다.
//   · Resend  — RESEND_API_KEY 가 있으면 이쪽 (설치할 것 없이 바로 됨)
//   · SMTP    — SMTP_HOST 등이 있으면 이쪽 (학교 메일 서버를 쓸 때)
//
// 어느 값도 없으면 보내지 않고, **어떤 이름의 값이 필요한지만** 알려준다.
// 비밀 값 자체는 화면이나 기록에 남기지 않는다. (CLAUDE.md 5·6번)

export type 보낸결과 =
  | { 됨: true; 방법: string }
  | { 됨: false; 이유: string; 필요한값?: string[] };

export type 메일 = {
  받는사람: string;
  제목: string;
  본문HTML: string;
  본문글자: string;
};

/** 보내는 사람 주소. 없으면 받는 사람과 같게 둔다. */
function 보내는사람(기본: string): string {
  return process.env.MAIL_FROM || 기본;
}

// ── Resend (HTTP로 보냄. 추가 설치 필요 없음) ──────────────────

async function Resend로_보내기(메일: 메일): Promise<보낸결과> {
  const 열쇠 = process.env.RESEND_API_KEY;
  if (!열쇠) return { 됨: false, 이유: 'RESEND_API_KEY 없음' };

  const 응답 = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${열쇠}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 보내는사람(메일.받는사람),
      to: [메일.받는사람],
      subject: 메일.제목,
      html: 메일.본문HTML,
      text: 메일.본문글자,
    }),
  });

  if (!응답.ok) {
    // 응답 내용에 열쇠가 섞여 나올 수 있으므로 상태 번호만 남긴다
    return { 됨: false, 이유: `메일 서비스가 거절했습니다 (${응답.status})` };
  }
  return { 됨: true, 방법: 'Resend' };
}

// ── SMTP (학교 메일 서버 등) ──────────────────────────────────

async function SMTP로_보내기(메일: 메일): Promise<보낸결과> {
  const 호스트 = process.env.SMTP_HOST;
  if (!호스트) return { 됨: false, 이유: 'SMTP_HOST 없음' };

  const nodemailer = (await import('nodemailer')).default;

  const 보내미 = nodemailer.createTransport({
    host: 호스트,
    port: Number(process.env.SMTP_PORT ?? 587),
    // 465면 처음부터 암호화, 그 밖에는 접속 후 암호화(STARTTLS)
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  await 보내미.sendMail({
    from: 보내는사람(process.env.SMTP_USER ?? 메일.받는사람),
    to: 메일.받는사람,
    subject: 메일.제목,
    html: 메일.본문HTML,
    text: 메일.본문글자,
  });

  return { 됨: true, 방법: 'SMTP' };
}

// ── 고르기 ────────────────────────────────────────────────────

/** 지금 메일을 보낼 수 있는 상태인지 */
export function 메일_보낼수있나(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}

/** 재설정 메일을 받을 사업단 공용 주소 */
export function 사업단_메일주소(): string | null {
  return process.env.ADMIN_EMAIL || null;
}

export async function 메일_보내기(메일: 메일): Promise<보낸결과> {
  try {
    if (process.env.RESEND_API_KEY) return await Resend로_보내기(메일);
    if (process.env.SMTP_HOST) return await SMTP로_보내기(메일);
  } catch {
    return { 됨: false, 이유: '메일을 보내지 못했습니다.' };
  }

  return {
    됨: false,
    이유: '메일 보내는 설정이 없습니다.',
    필요한값: [
      'ADMIN_EMAIL (받을 사업단 공용 주소)',
      '그리고 아래 중 한 가지',
      '  RESEND_API_KEY, MAIL_FROM',
      '  또는 SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM',
    ],
  };
}
