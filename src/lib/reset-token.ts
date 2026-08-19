// 비밀번호 재설정 링크에 들어가는 표(토큰)를 만들고 확인한다.
//
// 지켜야 할 것 두 가지.
//   1. 30분이 지나면 못 쓴다
//   2. 한 번 쓰면 못 쓴다 — 메일이 남에게 전달되어도 두 번은 안 통한다
//
// 두 번째를 위해 저장소에 "지금 살아 있는 표"를 하나만 기억해 둔다.
// 새로 요청하면 앞의 것은 자동으로 죽는다.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { 저장소 } from '@/lib/store';

const 저장열쇠 = 'admin_reset_token';

/** 30분 */
const 유효_밀리초 = 30 * 60 * 1000;

function 비밀열쇠(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET 값이 없습니다. .env 에 넣어 주세요.');
  return s;
}

function 서명(내용: string): string {
  return createHmac('sha256', 비밀열쇠()).update(내용).digest('base64url');
}

/**
 * 새 재설정 표를 만든다. 앞서 만든 표는 더 이상 쓸 수 없게 된다.
 * @returns 링크에 붙일 글자
 */
export async function 재설정표_만들기(): Promise<string> {
  const 씨앗 = randomBytes(24).toString('base64url');
  const 만료 = Date.now() + 유효_밀리초;

  // 메일로 오가는 값이라 글자·숫자·- _ 만 남게 감싼다.
  // 메일 전송 방식에 따라 특수문자가 바뀔 수 있기 때문이다.
  const 내용 = Buffer.from(`${씨앗}|${만료}`, 'utf8').toString('base64url');
  const 표 = `${내용}.${서명(내용)}`;

  // 저장소에는 표 자체가 아니라 뒤섞은 값만 둔다.
  // 저장소가 새어도 그 값으로 링크를 만들 수는 없다.
  await 저장소().설정_쓰기(저장열쇠, 서명(표));

  return 표;
}

export type 확인결과 = { 좋음: true } | { 좋음: false; 이유: string };

/** 표가 살아 있는지 본다. 아직 쓰지는 않는다. */
export async function 재설정표_확인(표: string): Promise<확인결과> {
  const 나눔 = 표.lastIndexOf('.');
  if (나눔 < 0) return { 좋음: false, 이유: '링크가 올바르지 않습니다.' };

  const 내용 = 표.slice(0, 나눔);
  const 붙은서명 = 표.slice(나눔 + 1);

  // 1. 서명이 맞는가 (남이 지어낸 것이 아닌가)
  const 기대 = 서명(내용);
  const a = Buffer.from(붙은서명);
  const b = Buffer.from(기대);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { 좋음: false, 이유: '링크가 올바르지 않습니다.' };
  }

  // 2. 시간이 지나지 않았는가
  let 푼내용: string;
  try {
    푼내용 = Buffer.from(내용, 'base64url').toString('utf8');
  } catch {
    return { 좋음: false, 이유: '링크가 올바르지 않습니다.' };
  }
  const 만료 = Number(푼내용.slice(푼내용.lastIndexOf('|') + 1));
  if (!Number.isFinite(만료) || Date.now() > 만료) {
    return { 좋음: false, 이유: '링크의 유효 시간(30분)이 지났습니다. 다시 요청해 주세요.' };
  }

  // 3. 아직 안 쓴 표인가 (저장된 것과 같은가)
  let 저장된값: string | null = null;
  try {
    저장된값 = await 저장소().설정_읽기(저장열쇠);
  } catch {
    return { 좋음: false, 이유: '지금은 확인할 수 없습니다. 잠시 뒤 다시 시도해 주세요.' };
  }

  if (!저장된값 || 저장된값 !== 서명(표)) {
    return { 좋음: false, 이유: '이미 사용했거나 더 이상 쓸 수 없는 링크입니다.' };
  }

  return { 좋음: true };
}

/** 다 썼으니 죽인다. 같은 링크로 두 번 바꿀 수 없게. */
export async function 재설정표_쓰기완료(): Promise<void> {
  await 저장소().설정_쓰기(저장열쇠, '');
}
