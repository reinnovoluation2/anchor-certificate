// A1. 담당자 로그인 화면 (DESIGN.md 1장)
// 회원가입·비밀번호 찾기 링크는 없다. 사업단 공용 계정 하나뿐이다.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function LoginPage() {
  const router = useRouter();
  const [아이디, set아이디] = useState('');
  const [비밀번호, set비밀번호] = useState('');
  const [오류, set오류] = useState('');
  const [보내는중, set보내는중] = useState(false);

  // 비밀번호 재설정 메일 보내기
  const [메일알림, set메일알림] = useState<{ 좋음: boolean; 글: string } | null>(null);
  const [메일보내는중, set메일보내는중] = useState(false);

  async function 재설정메일() {
    set메일알림(null);
    set메일보내는중(true);
    try {
      const 응답 = await fetch('/api/admin/reset/request', { method: 'POST' });
      const 몸통 = await 응답.json();
      if (!응답.ok) {
        set메일알림({ 좋음: false, 글: 몸통.메시지 ?? '메일을 보내지 못했습니다.' });
        return;
      }
      set메일알림({
        좋음: true,
        글: `사업단 공용 메일(${몸통.보낸곳})로 재설정 링크를 보냈습니다. 30분 안에 열어 주세요.`,
      });
    } catch {
      set메일알림({ 좋음: false, 글: '지금은 서비스를 이용할 수 없습니다. 잠시 뒤 다시 시도해 주세요.' });
    } finally {
      set메일보내는중(false);
    }
  }

  async function 보내기(e: React.FormEvent) {
    e.preventDefault();
    set오류('');
    set보내는중(true);
    try {
      const 응답 = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 아이디, password: 비밀번호 }),
      });
      const 결과 = await 응답.json();
      if (!응답.ok) {
        set오류(결과.메시지 ?? '로그인하지 못했습니다.');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      set오류('지금은 서비스를 이용할 수 없습니다. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      set보내는중(false);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-sm px-6 py-16">
        <h1 className="text-center text-2xl font-bold tracking-[0.15em] text-[#862633]">
          담당자 로그인
        </h1>
        <hr className="mx-auto my-6 w-12 border-t border-[#862633]" />

        <form onSubmit={보내기} className="space-y-4">
          <div>
            <label htmlFor="아이디" className="block text-sm">아이디</label>
            <input
              id="아이디"
              value={아이디}
              onChange={(e) => set아이디(e.target.value)}
              autoComplete="username"
              required
              className="mt-1 w-full rounded border border-[#ccc] px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="비밀번호" className="block text-sm">비밀번호</label>
            <input
              id="비밀번호"
              type="password"
              value={비밀번호}
              onChange={(e) => set비밀번호(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded border border-[#ccc] px-3 py-2"
            />
          </div>

          {오류 && (
            <p role="alert" className="rounded bg-[#fdf2f3] px-3 py-2 text-sm text-[#862633]">
              {오류}
            </p>
          )}

          <button
            type="submit"
            disabled={보내는중}
            className="w-full rounded bg-[#862633] px-4 py-2.5 text-white disabled:opacity-60"
          >
            {보내는중 ? '확인하는 중…' : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={재설정메일}
            disabled={메일보내는중}
            className="text-sm text-[#555] underline underline-offset-2 disabled:opacity-60"
          >
            {메일보내는중 ? '메일 보내는 중…' : '비밀번호를 잊으셨나요?'}
          </button>
        </div>

        {메일알림 && (
          <p
            role="status"
            className={`mt-3 rounded px-3 py-2 text-xs leading-relaxed ${
              메일알림.좋음 ? 'bg-[#f5faf5] text-[#2f6b2f]' : 'bg-[#fdf2f3] text-[#862633]'
            }`}
          >
            {메일알림.글}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-[#555]">
          사업단 공용 계정입니다. 재설정 링크는 미리 정해둔 사업단 메일로만 갑니다.
        </p>
      </main>
    </>
  );
}
