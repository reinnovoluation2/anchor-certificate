// 머리글 오른쪽의 로그아웃 버튼.
'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function 나가기() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={나가기}
      className="rounded border border-[#ccc] px-3 py-1.5 text-sm text-[#555]"
    >
      로그아웃
    </button>
  );
}
