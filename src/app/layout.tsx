import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "수료증 발급 | 고려대학교 ANCHOR사업단",
  description:
    "ANCHOR사업 프로그램 수료자가 학번과 이름으로 수료증을 직접 발급받는 곳입니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // lang="ko" — 화면이 한국어이므로 브라우저와 읽기 도구에 알린다
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
