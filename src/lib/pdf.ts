// HTML을 A4 한 장짜리 PDF로 만든다.
// Design Ref: DESIGN.md 3-3 — 화면과 PDF를 똑같이 만들기 위해 서버 안의 크롬으로 찍는다.

import type { Browser } from 'puppeteer-core';

/**
 * 크롬을 띄운다.
 * - 내 컴퓨터(개발): puppeteer가 받아둔 크롬을 쓴다.
 * - Vercel(배포): 리눅스용 가벼운 크롬(@sparticuz/chromium)을 쓴다.
 *
 * 두 곳의 실행 파일이 다르기 때문에 갈라 놓았다.
 */
async function 크롬_띄우기(): Promise<Browser> {
  const 배포환경 = Boolean(process.env.VERCEL);

  if (배포환경) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = await import('puppeteer-core');
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    }) as unknown as Promise<Browser>;
  }

  // 개발용. puppeteer(전체판)는 크롬 위치를 스스로 알고 있다.
  const puppeteer = await import('puppeteer');
  return puppeteer.launch({ headless: true }) as unknown as Promise<Browser>;
}

/**
 * HTML 한 덩어리를 받아 A4 세로 한 장짜리 PDF로 만들어 돌려준다.
 *
 * 글꼴이 다 내려받아진 뒤에 찍어야 한다. 안 그러면 한글이 네모로 나온다.
 */
export async function HTML을_PDF로(html: string): Promise<Buffer> {
  const browser = await 크롬_띄우기();
  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'load' });

    // 글꼴이 준비될 때까지 기다린다. 글꼴 파일을 HTML 안에 직접 넣었으므로
    // 따로 받아올 것이 없고, 이 한 줄이면 충분하다.
    // 이걸 빠뜨리면 글꼴이 적용되기 전에 찍혀 한글이 네모로 나온다.
    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
