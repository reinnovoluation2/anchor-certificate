// A2. 명단 관리 화면 (DESIGN.md 1장)
// 로그인해야만 들어온다. 주소를 직접 쳐도 로그인 화면으로 돌아간다.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { 담당자인가 } from '@/lib/session';
import { 저장소 } from '@/lib/store';
import RosterManager from './RosterManager';
import LogoutButton from './LogoutButton';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await 담당자인가())) {
    redirect('/admin/login');
  }

  // 지금 저장된 명단이 몇 건인지 보여준다
  let 건수: number | null = null;
  let 연도들: string[] = [];
  let 저장소_문제 = false;
  try {
    const 전부 = await 저장소().전부();
    건수 = 전부.length;
    연도들 = [...new Set(전부.map((r) => r.해당연도))].sort();
  } catch {
    저장소_문제 = true;
  }

  return (
    <>
      <Header 오른쪽={<LogoutButton />} />

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">수료자 명단 관리</h1>
          <Link
            href="/admin/password"
            className="text-sm text-[#555] underline underline-offset-2"
          >
            비밀번호 변경
          </Link>
        </div>

        <RosterManager />

        <section className="mt-8 rounded border border-[#e5e5e5] px-5 py-4 text-sm">
          {저장소_문제 ? (
            <p className="text-[#862633]">
              지금은 명단을 불러올 수 없습니다. 잠시 뒤 다시 시도해 주세요.
            </p>
          ) : 건수 === 0 ? (
            <p className="text-[#555]">
              현재 저장된 명단 : 아직 등록된 명단이 없습니다. 1단계부터 진행해 주세요.
            </p>
          ) : (
            <p>
              현재 저장된 명단 :{' '}
              <strong>
                {연도들.join(', ')}년 {건수}건
              </strong>
            </p>
          )}
        </section>
      </main>
    </>
  );
}
