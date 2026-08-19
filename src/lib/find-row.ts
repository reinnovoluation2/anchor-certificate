// 출입증에 담긴 학번과 요청한 프로그램으로 명단 한 줄을 찾아온다.
// 수료증 미리보기와 PDF가 같은 방식으로 찾아야 하므로 한 곳에 모아 둔다.

import { 저장소 } from '@/lib/store';
import { 출입증_학번 } from '@/lib/session';
import { 발급_관리번호, 영문_발급가능, type 명단줄 } from '@/lib/roster';
import type { 언어 } from '@/lib/certificate';

export type 찾기결과 =
  | { 됨: true; 줄: 명단줄 }
  | { 됨: false; 상태: number; 메시지: string };

/**
 * @param 관리번호 연도-단위과제번호-프로그램번호 (예: 2026-02-05)
 * @param 언어 국문이면 늘 되고, 영문은 프로그램 영문명이 있어야 한다
 */
export async function 수료증_줄_찾기(
  관리번호: string,
  언어: 언어,
): Promise<찾기결과> {
  // 1. 임시 출입증이 유효한지
  const 학번 = await 출입증_학번();
  if (!학번) {
    return { 됨: false, 상태: 401, 메시지: '시간이 지나 처음부터 다시 확인이 필요합니다.' };
  }

  // 2. 그 학번의 줄 중에서 관리번호가 맞는 것
  let 전부: 명단줄[];
  try {
    전부 = await 저장소().전부();
  } catch {
    return { 됨: false, 상태: 503, 메시지: '지금은 서비스를 이용할 수 없습니다. 잠시 뒤 다시 시도해 주세요.' };
  }

  const 줄 = 전부.find(
    (r) => r.학번 === 학번 && 발급_관리번호(r) === 관리번호,
  );

  if (!줄) {
    return { 됨: false, 상태: 404, 메시지: '수료 내역을 찾을 수 없습니다.' };
  }

  // 3. 영문은 프로그램 영문명이 있어야 발급한다
  if (언어 === 'en' && !영문_발급가능(줄)) {
    return {
      됨: false,
      상태: 400,
      메시지: '이 프로그램은 영문 수료증을 준비 중입니다. 국문으로만 발급됩니다.',
    };
  }

  return { 됨: true, 줄 };
}
