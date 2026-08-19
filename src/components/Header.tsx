// 모든 화면 위쪽에 들어가는 머리글.
// 웹 화면에는 가로형 로고를 쓴다 — 화면은 폭이 넓고 세로 공간은 아껴야 한다.

import Image from 'next/image';
import Link from 'next/link';

export default function Header({ 오른쪽 }: { 오른쪽?: React.ReactNode }) {
  return (
    <header className="border-b border-[#e5e5e5]">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" aria-label="처음으로">
          <Image
            src="/logo/logo-horizontal.png"
            alt="고려대학교 ANCHOR사업단"
            width={548}
            height={70}
            priority
            className="h-7 w-auto"
          />
        </Link>
        {오른쪽}
      </div>
    </header>
  );
}
