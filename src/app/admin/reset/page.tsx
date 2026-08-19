// 메일로 받은 링크를 눌렀을 때 나오는 화면. 새 비밀번호를 정한다.

import Link from 'next/link';
import Header from '@/components/Header';
import { 재설정표_확인 } from '@/lib/reset-token';
import ResetForm from './ResetForm';

export const dynamic = 'force-dynamic';

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const 표 = token ?? '';

  const 확인 = 표 ? await 재설정표_확인(표) : { 좋음: false as const, 이유: '링크가 올바르지 않습니다.' };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-sm px-6 py-12">
        <h1 className="text-center text-xl font-bold">새 비밀번호 정하기</h1>
        <hr className="mx-auto my-5 w-12 border-t border-[#862633]" />

        {확인.좋음 ? (
          <ResetForm 표={표} />
        ) : (
          <>
            <p className="rounded bg-[#fdf2f3] px-3 py-3 text-sm leading-relaxed text-[#862633]">
              {확인.이유}
            </p>
            <p className="mt-5 text-center text-sm">
              <Link href="/admin/login" className="text-[#555] underline underline-offset-2">
                로그인 화면으로
              </Link>
            </p>
          </>
        )}
      </main>
    </>
  );
}
