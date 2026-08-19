// 로그인 표시와 학생 임시 출입증을 만들고 확인한다.
//
// 로그인 도구(NextAuth 등)를 쓰지 않는다. 공용 계정 하나뿐이라 필요 없다.
// Design Ref: DESIGN.md 3-5

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { 비밀번호_확인 } from '@/lib/admin-password';

const 담당자_쿠키 = 'anchor_admin';
const 출입증_쿠키 = 'anchor_pass';

/** 담당자 로그인은 8시간, 학생 출입증은 30분 (DESIGN.md 흐름 ③) */
const 담당자_유효초 = 8 * 60 * 60;
const 출입증_유효초 = 30 * 60;

function 비밀열쇠(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    // 값 자체는 절대 화면이나 기록에 남기지 않는다. 이름만 알린다.
    throw new Error('SESSION_SECRET 값이 없습니다. .env 에 넣어 주세요.');
  }
  return s;
}

/** 내용에 서명을 붙인다. 서명이 있어야 남이 쿠키를 지어낼 수 없다. */
function 서명하기(내용: string): string {
  const 서명 = createHmac('sha256', 비밀열쇠()).update(내용).digest('base64url');
  return `${Buffer.from(내용, 'utf8').toString('base64url')}.${서명}`;
}

/** 서명이 맞는지 보고, 맞으면 내용을 돌려준다. */
function 서명확인(값: string): string | null {
  const [담긴내용, 서명] = 값.split('.');
  if (!담긴내용 || !서명) return null;

  let 내용: string;
  try {
    내용 = Buffer.from(담긴내용, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const 기대 = createHmac('sha256', 비밀열쇠()).update(내용).digest('base64url');
  const a = Buffer.from(서명);
  const b = Buffer.from(기대);
  // 길이가 다르면 timingSafeEqual이 예외를 던지므로 먼저 확인한다
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return 내용;
}

/** `내용|만료시각` 형태를 만들고 확인하는 공통 부분 */
function 만료붙이기(내용: string, 유효초: number): string {
  const 만료 = Date.now() + 유효초 * 1000;
  return 서명하기(`${내용}|${만료}`);
}

function 만료확인(값: string | undefined): string | null {
  if (!값) return null;
  const 내용 = 서명확인(값);
  if (!내용) return null;

  const 나눔 = 내용.lastIndexOf('|');
  if (나눔 < 0) return null;

  const 알맹이 = 내용.slice(0, 나눔);
  const 만료 = Number(내용.slice(나눔 + 1));
  if (!Number.isFinite(만료) || Date.now() > 만료) return null;

  return 알맹이;
}

// ── 담당자 ──────────────────────────────────────────────────────

/**
 * 아이디·비밀번호가 맞는지 본다. 값은 어디에도 출력하지 않는다.
 * 비밀번호는 담당자가 바꿀 수 있으므로 admin-password.ts 가 판단한다.
 */
export async function 담당자_확인(아이디: string, 비밀번호: string): Promise<boolean> {
  const 참아이디 = process.env.ADMIN_ID;
  if (!참아이디) {
    throw new Error('ADMIN_ID 값이 없습니다. .env 에 넣어 주세요.');
  }

  // 글자 수 차이로 짐작하지 못하도록 길이를 맞춰 비교한다
  const x = Buffer.from(아이디.padEnd(64).slice(0, 64));
  const y = Buffer.from(참아이디.padEnd(64).slice(0, 64));
  if (!timingSafeEqual(x, y)) return false;

  return 비밀번호_확인(비밀번호);
}

export async function 담당자_로그인표시_심기(): Promise<void> {
  const 쿠키 = await cookies();
  쿠키.set(담당자_쿠키, 만료붙이기('admin', 담당자_유효초), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 담당자_유효초,
  });
}

export async function 담당자_로그인표시_지우기(): Promise<void> {
  const 쿠키 = await cookies();
  쿠키.delete(담당자_쿠키);
}

export async function 담당자인가(): Promise<boolean> {
  const 쿠키 = await cookies();
  return 만료확인(쿠키.get(담당자_쿠키)?.value) === 'admin';
}

// ── 학생 임시 출입증 ────────────────────────────────────────────
//
// 조회에 성공했다는 표시. 학번과 이름을 주소창에 남기지 않기 위해 쓴다.
// 쿠키에는 확인된 학번만 담고 이름은 담지 않는다.

export async function 출입증_주기(학번: string): Promise<void> {
  const 쿠키 = await cookies();
  쿠키.set(출입증_쿠키, 만료붙이기(학번, 출입증_유효초), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 출입증_유효초,
  });
}

/** 유효한 출입증이 있으면 그 학번을, 없거나 시간이 지났으면 null을 돌려준다. */
export async function 출입증_학번(): Promise<string | null> {
  const 쿠키 = await cookies();
  return 만료확인(쿠키.get(출입증_쿠키)?.value);
}

export async function 출입증_지우기(): Promise<void> {
  const 쿠키 = await cookies();
  쿠키.delete(출입증_쿠키);
}
