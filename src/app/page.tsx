// 첫 화면 — 학생이 수료증을 발급받는 곳. 로그인 없이 쓴다.
// Design Ref: DESIGN.md 1장 S1~S3

import Link from 'next/link';
import Header from '@/components/Header';
import Issue from './Issue';

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <Issue />
      </main>

      <footer className="mx-auto w-full max-w-3xl px-6 pb-10 text-center text-xs text-[#888]">
        <p>고려대학교 ANCHOR사업단</p>
        {/* 담당자용 링크. 주소를 감추는 것은 보안이 되지 않고 담당자만 불편해지므로,
            학생 눈에 띄지 않을 만큼만 작게 둔다. 실제 보호는 로그인이 한다. */}
        <p className="mt-2">
          <Link href="/admin" className="text-[#aaa] underline underline-offset-2">
            담당자
          </Link>
        </p>
      </footer>
    </>
  );
}
