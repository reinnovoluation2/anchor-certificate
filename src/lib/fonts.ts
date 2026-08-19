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
 * 수료증용 @font-face CSS를 만든다.
 *
 * 글꼴 파일을 글자(base64)로 바꿔 CSS 안에 직접 넣는다.
 * 이렇게 하면 크롬이 따로 파일을 받아올 필요가 없어, 글꼴이 빠질 일이 없다.
 */
export async function 수료증_글꼴_CSS(): Promise<string> {
  if (기억해둔_CSS) return 기억해둔_CSS;

  const [본문, 굵게, 라틴, 라틴굵게] = await Promise.all([
    글꼴을_문자로('serif-kr.woff2'),
    글꼴을_문자로('serif-kr-bold.woff2'),
    글꼴을_문자로('serif-latin.woff2'),
    글꼴을_문자로('serif-latin-bold.woff2'),
  ]);

  const face = (base64: string, weight: number) => `
@font-face {
  font-family: 'Noto Serif KR';
  font-style: normal;
  font-weight: ${weight};
  font-display: block;
  src: url(data:font/woff2;base64,${base64}) format('woff2');
}`;

  기억해둔_CSS = [
    face(라틴, 400),
    face(라틴굵게, 700),
    face(본문, 400),
    face(굵게, 700),
  ].join('\n');

  return 기억해둔_CSS;
}
