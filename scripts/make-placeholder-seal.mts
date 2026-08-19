// 임시 직인 이미지를 만든다.
//
// **진짜 직인이 아니다.** 서식과 배치를 확인하기 위한 자리표시용이다.
// 실제 직인 이미지를 받으면 private/seal.png 를 덮어쓰면 된다.
//
// 실행: npx tsx scripts/make-placeholder-seal.mts

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const 크기 = 512; // 수료증에는 18mm로 들어가므로 넉넉하게 크게 만든다

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  html, body { margin: 0; padding: 0; background: transparent; }
  .직인 {
    width: ${크기}px;
    height: ${크기}px;
    box-sizing: border-box;
    /* 전통적인 직인처럼 빨간 네모 테두리 */
    border: ${크기 * 0.055}px solid #C8102E;
    border-radius: ${크기 * 0.03}px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${크기 * 0.03}px;
    font-family: "맑은 고딕", "Malgun Gothic", sans-serif;
    color: #C8102E;
    font-weight: 700;
    letter-spacing: 0.1em;
  }
  .위 { font-size: ${크기 * 0.15}px; }
  .가운데 { font-size: ${크기 * 0.26}px; letter-spacing: 0.15em; }
  .아래 { font-size: ${크기 * 0.09}px; letter-spacing: 0.05em; }
</style></head>
<body>
  <div class="직인">
    <div class="위">임 시</div>
    <div class="가운데">직 인</div>
    <div class="아래">PLACEHOLDER</div>
  </div>
</body></html>`;

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 크기, height: 크기, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  const 그림 = await page.screenshot({
    type: 'png',
    omitBackground: true, // 배경이 비치게 (수료증 글자 위에 겹쳐 찍히므로)
  });

  const 경로 = path.join(process.cwd(), 'private', 'seal.png');
  await mkdir(path.dirname(경로), { recursive: true });
  await writeFile(경로, 그림);
  console.log(`임시 직인 만듦 → ${경로} (${크기}×${크기}, ${그림.length} bytes)`);
  console.log('※ 진짜 직인이 아닙니다. 실제 이미지를 받으면 이 파일을 덮어쓰세요.');
} finally {
  await browser.close();
}
