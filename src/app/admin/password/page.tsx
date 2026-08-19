// 담당자 비밀번호 변경 화면. 로그인해야만 들어온다.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { 담당자인가 } from '@/lib/session';
import { 비밀번호_바뀐적있나 } from '@/lib/admin-password';
import PasswordForm from './PasswordForm';

export const dynamic = 'force-dynamic';

export default async function PasswordPage() {
  if (!(await 담당자인가())) {
    redirect('/admin/login');
  }

  const 바꾼적있음 = await 비밀번호_바뀐적있나();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-sm px-6 py-12">
        <h1 className="text-center text-xl font-bold">비밀번호 변경</h1>
        <hr className="mx-auto my-5 w-12 border-t border-[#862633]" />

        {!바꾼적있음 && (
          <p className="mb-5 rounded bg-[#fff8e6] px-3 py-2 text-xs leading-relaxed text-[#8a6d00]">
            아직 처음 설정된 비밀번호를 쓰고 있습니다. 지금 바꿔 두시길 권합니다.
          </p>
        )}

        <PasswordForm />

        <p className="mt-6 text-center text-sm">
          <Link href="/admin" className="text-[#555] underline underline-offset-2">
            명단 관리로 돌아가기
          </Link>
        </p>
      </main>
    </>
  );
}
