// 비밀번호 변경 입력칸. 숫자 네 자리만 받는다.

'use client';

import { useState } from 'react';

export default function PasswordForm() {
  const [지금것, set지금것] = useState('');
  const [새것, set새것] = useState('');
  const [또한번, set또한번] = useState('');
  const [알림, set알림] = useState<{ 좋음: boolean; 글: string } | null>(null);
  const [보내는중, set보내는중] = useState(false);

  // 숫자만, 네 자리까지
  const 숫자만 = (v: string) => v.replace(/\D/g, '').slice(0, 4);

  async function 보내기(e: React.FormEvent) {
    e.preventDefault();
    set알림(null);

    if (새것 !== 또한번) {
      set알림({ 좋음: false, 글: '새 비밀번호가 서로 다릅니다.' });
      return;
    }

    set보내는중(true);
    try {
      const 응답 = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: 지금것, next: 새것 }),
      });
      const 몸통 = await 응답.json();

      if (!응답.ok) {
        set알림({ 좋음: false, 글: 몸통.메시지 ?? '바꾸지 못했습니다.' });
        return;
      }

      set알림({ 좋음: true, 글: '비밀번호를 바꿨습니다. 다음 로그인부터 새 비밀번호를 쓰세요.' });
      set지금것('');
      set새것('');
      set또한번('');
    } catch {
      set알림({ 좋음: false, 글: '지금은 서비스를 이용할 수 없습니다. 잠시 뒤 다시 시도해 주세요.' });
    } finally {
      set보내는중(false);
    }
  }

  const 칸 = 'mt-1 w-full rounded border border-[#ccc] px-3 py-2 tracking-[0.5em] text-center';

  return (
    <form onSubmit={보내기} className="space-y-4">
      <div>
        <label htmlFor="지금것" className="block text-sm">지금 비밀번호</label>
        <input
          id="지금것"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          value={지금것}
          onChange={(e) => set지금것(숫자만(e.target.value))}
          required
          className={칸}
        />
      </div>

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

      {알림 && (
        <p
          role="alert"
          className={`rounded px-3 py-2 text-sm ${
            알림.좋음 ? 'bg-[#f5faf5] text-[#2f6b2f]' : 'bg-[#fdf2f3] text-[#862633]'
          }`}
        >
          {알림.글}
        </p>
      )}

      <button
        type="submit"
        disabled={보내는중 || 새것.length !== 4 || 또한번.length !== 4 || 지금것.length !== 4}
        className="w-full rounded bg-[#862633] px-4 py-2.5 text-white disabled:opacity-60"
      >
        {보내는중 ? '바꾸는 중…' : '비밀번호 바꾸기'}
      </button>
    </form>
  );
}
