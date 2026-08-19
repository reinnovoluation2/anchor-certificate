// 수료증 PDF에 넣을 글꼴을 CSS로 만들어 준다.
// Design Ref: DESIGN.md 3-4 — 글꼴 파일을 프로젝트 안에 넣어 두고 PDF에 포함시킨다.
//             인터넷에서 불러오면 서버에서 PDF를 만들 때 글꼴이 빠져 한글이 깨진다.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

// 한 번 읽으면 기억해 둔다. 요청마다 1MB짜리 파일을 다시 읽지 않기 위해서다.
let 기억해둔_CSS: string | null = null;

async function 글꼴을_문자로(파일명: string): Promise<string> {
  const 경로 = path.join(process.cwd(), 'public', 'fonts', 파일명);
  const 내용 = await readFile(경로);
  return 내용.toString('base64');
}

/**
 * 글꼴 조각 목록.
 *
 * **`범위`(unicode-range)를 반드시 붙여야 한다.**
 * 같은 이름·같은 굵기로 여러 번 선언하면서 범위를 안 주면
 * 브라우저가 **마지막 것 하나만 쓰고 나머지를 무시한다.**
 * 그러면 조각을 아무리 넣어도 소용이 없다.
 *
 * 아래에서 먼저 오는 것이 넓은 범위, 뒤에 오는 것이 좁은 범위다.
 * 같은 글자를 둘 다 담고 있으면 **뒤에 온 것이 이긴다.**
 */
const 조각들 = [
  // 1. 한글 전체 — 범위를 주지 않아 모든 글자를 받는다 (바탕이 된다)
  { 파일: 'serif-kr.woff2', 굵기: 400, 범위: null },
  { 파일: 'serif-kr-bold.woff2', 굵기: 700, 범위: null },

  // 2. 라틴 글자 — 영문 수료증과 학번·숫자에 쓴다
  {
    파일: 'serif-latin.woff2',
    굵기: 400,
    범위: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
  {
    파일: 'serif-latin-bold.woff2',
    굵기: 700,
    범위: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },

  // 3. 「 」 같은 한중일 문장부호 — 1번 한글 조각에 들어 있지 않다.
  //    내 컴퓨터에서는 크롬이 시스템 글꼴로 대신 그려주지만,
  //    서버(Vercel)에는 시스템 글꼴이 없어 네모(□)로 나온다.
  { 파일: 'serif-punct.woff2', 굵기: 400, 범위: 'U+3000-303F' },
  { 파일: 'serif-punct-bold.woff2', 굵기: 700, 범위: 'U+3000-303F' },
] as const;

/**
 * 수료증용 @font-face CSS를 만든다.
 *
 * 글꼴 파일을 글자(base64)로 바꿔 CSS 안에 직접 넣는다.
 * 이렇게 하면 크롬이 따로 파일을 받아올 필요가 없어, 글꼴이 빠질 일이 없다.
 */
export async function 수료증_글꼴_CSS(): Promise<string> {
  if (기억해둔_CSS) return 기억해둔_CSS;

  const 읽은것 = await Promise.all(조각들.map((조각) => 글꼴을_문자로(조각.파일)));

  기억해둔_CSS = 조각들
    .map((조각, i) => {
      const 범위줄 = 조각.범위 ? `\n  unicode-range: ${조각.범위};` : '';
      return `
@font-face {
  font-family: 'Noto Serif KR';
  font-style: normal;
  font-weight: ${조각.굵기};
  font-display: block;
  src: url(data:font/woff2;base64,${읽은것[i]}) format('woff2');${범위줄}
}`;
    })
    .join('\n');

  return 기억해둔_CSS;
}
