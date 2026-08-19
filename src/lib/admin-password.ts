// 담당자 비밀번호를 확인하고 바꾼다.
//
// 비밀번호는 **그대로 저장하지 않는다.** 되돌릴 수 없게 뒤섞은 값(해시)만 저장한다.
// 저장소가 새어도 비밀번호 자체는 알 수 없다.
//
// 처음에는 .env 의 ADMIN_PASSWORD 를 쓰고,
// 담당자가 한 번 바꾸면 그때부터 저장소의 값을 쓴다.
// (.env 는 실행 중에 바꿀 수 없기 때문이다. Vercel도 마찬가지다.)

import { randomBytes, scrypt as scrypt콜백, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { 저장소 } from '@/lib/store';

const scrypt = promisify(scrypt콜백) as (
  비밀번호: string,
  소금: Buffer,
  길이: number,
) => Promise<Buffer>;

const 저장열쇠 = 'admin_password_hash';

/** 비밀번호 규칙 — 숫자 네 자리 */
export const 비밀번호_규칙 = /^\d{4}$/;
export const 비밀번호_안내 = '비밀번호는 숫자 네 자리입니다.';

/** 비밀번호를 되돌릴 수 없는 값으로 바꾼다. 소금을 섞어 같은 값이라도 결과가 달라진다. */
async function 뒤섞기(비밀번호: string, 소금?: Buffer): Promise<string> {
  const 쓸소금 = 소금 ?? randomBytes(16);
  const 결과 = await scrypt(비밀번호, 쓸소금, 32);
  return `${쓸소금.toString('base64url')}.${결과.toString('base64url')}`;
}

async function 맞나(비밀번호: string, 저장된값: string): Promise<boolean> {
  const [소금글자, 값글자] = 저장된값.split('.');
  if (!소금글자 || !값글자) return false;

  const 소금 = Buffer.from(소금글자, 'base64url');
  const 기대 = Buffer.from(값글자, 'base64url');
  const 실제 = await scrypt(비밀번호, 소금, 기대.length);

  return 실제.length === 기대.length && timingSafeEqual(실제, 기대);
}

/** 담당자가 비밀번호를 한 번이라도 바꿨는지 */
export async function 비밀번호_바뀐적있나(): Promise<boolean> {
  try {
    return (await 저장소().설정_읽기(저장열쇠)) !== null;
  } catch {
    return false;
  }
}

/**
 * 입력한 비밀번호가 맞는지 본다.
 * 바꾼 적이 있으면 저장된 값과, 없으면 .env 값과 견준다.
 */
export async function 비밀번호_확인(비밀번호: string): Promise<boolean> {
  let 저장된값: string | null = null;
  try {
    저장된값 = await 저장소().설정_읽기(저장열쇠);
  } catch {
    // 저장소를 못 읽으면 .env 값으로 넘어간다
  }

  if (저장된값) return 맞나(비밀번호, 저장된값);

  const 처음값 = process.env.ADMIN_PASSWORD;
  if (!처음값) {
    throw new Error('ADMIN_PASSWORD 값이 없습니다. .env 에 넣어 주세요.');
  }

  // 글자 수 차이로 짐작하지 못하도록 길이를 맞춰 비교한다
  const a = Buffer.from(비밀번호.padEnd(64).slice(0, 64));
  const b = Buffer.from(처음값.padEnd(64).slice(0, 64));
  return timingSafeEqual(a, b);
}

/** 새 비밀번호로 바꾼다. 규칙에 맞는지는 부르는 쪽에서 미리 본다. */
export async function 비밀번호_바꾸기(새비밀번호: string): Promise<void> {
  const 뒤섞은값 = await 뒤섞기(새비밀번호);
  await 저장소().설정_쓰기(저장열쇠, 뒤섞은값);
}
