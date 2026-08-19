import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 아래 통로들은 글꼴·로고·직인 파일을 서버에서 직접 읽는다.
  // 여기에 적어두지 않으면 Vercel에 올릴 때 파일이 빠져
  // 한글이 깨지거나 로고·직인이 사라진다.
  // Design Ref: DESIGN.md 3-4
  outputFileTracingIncludes: {
    "/api/certificate/pdf": ["./public/fonts/**", "./public/logo/**", "./private/**"],
    "/api/certificate/preview": ["./public/fonts/**", "./public/logo/**"],
  },

  // 크롬은 서버에서만 쓴다. 화면 쪽 묶음에 딸려 들어가지 않게 떼어 놓는다.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "puppeteer"],
};

export default nextConfig;
