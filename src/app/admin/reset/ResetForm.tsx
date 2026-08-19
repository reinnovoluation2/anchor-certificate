// 재설정 링크로 들어온 사람이 새 비밀번호를 정하는 입력칸.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetForm({ 표 }: { 표: string }) {
  const router = useRouter();
  const [새것, set새것] = useState('');
  const [또한번, set또한번] = useState('');
  const [오류, set오류] = useState('');
  const [끝남, set끝남] = useState(false);
  const [보내는중, set보내는중] = useState(false);

  const 숫자만 = (v: string) => v.replace(/\D/g, '').slice(0, 4);

  async function 보내기(e: React.FormEvent) {
    e.preventDefault();
    set오류('');

    if (새것 !== 또한번) {
      set오류('새 비밀번호가 서로 다릅니다.');
      return;
    }

    set보내는중(true);
    try {
      const 응답 = await fetch('/api/admin/reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 표, next: 새것 }),
      });
      const 몸통 = await 응답.json();

      if (!응답.ok) {
        set오류(몸통.메시지 ?? '바꾸지 못했습니다.');
        return;
      }

      set끝남(true);
      setTimeout(() => router.push('/admin/login'), 2000);
    } catch {
      set오류('지금은 서비스를 이용할 수 없습니다. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      set보내는중(false);
    }
  }

  if (끝남) {
    return (
      <p className="rounded bg-[#f5faf5] px-3 py-3 text-sm leading-relaxed text-[#2f6b2f]">
        비밀번호를 바꿨습니다. 잠시 뒤 로그인 화면으로 이동합니다.
      </p>
    );
  }

  const 칸 = 'mt-1 w-full rounded border border-[#ccc] px-3 py-2 tracking-[0.5em] text-center';

  return (
    <form onSubmit={보내기} className="space-y-4">
      <div>
        <label htmlFor="새것" className="block text-sm">새 비밀번호</label>
        <input
          id="새것"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          value={새것}
          onChange={(e) => set새것(숫자만(e.target.value))}
          required
          autoFocus
          className={칸}
        />
        <p className="mt-1 text-xs text-[#555]">숫자 네 자리</p>
      </div>

      <div>
        <label htmlFor="또한번" className="block text-sm">새 비밀번호 확인</label>
        <input
          id="또한번"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          value={또한번}
          onChange={(e) => set또한번(숫자만(e.target.value))}
          required
          className={칸}
        />
      </div>

      {오류 && (
        <p role="alert" className="rounded bg-[#fdf2f3] px-3 py-2 text-sm text-[#862633]">
          {오류}
        </p>
      )}

      <button
        type="submit"
        disabled={보내는중 || 새것.length !== 4 || 또한번.length !== 4}
        className="w-full rounded bg-[#862633] px-4 py-2.5 text-white disabled:opacity-60"
      >
        {보내는중 ? '바꾸는 중…' : '비밀번호 정하기'}
      </button>
    </form>
  );
}
