// 수료증에 들어가는 그림(로고 등)을 PDF 안에 직접 넣을 수 있는 형태로 만들어 준다.
//
// 글꼴과 같은 이유다. 인터넷 주소로 걸어 두면 서버에서 PDF를 만들 때
// 그림을 받아오지 못해 빈칸으로 찍힐 수 있다.
// Design Ref: DESIGN.md 3-4

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const 기억해둠 = new Map<string, string>();

/**
 * public 폴더의 그림 파일을 CSS·HTML에 바로 쓸 수 있는 글자로 바꾼다.
 * @param 상대경로 public 폴더 안에서의 경로. 예: 'logo/logo-vertical.png'
 */
export async function 그림_데이터URI(상대경로: string): Promise<string> {
  const 이미_읽음 = 기억해둠.get(상대경로);
  if (이미_읽음) return 이미_읽음;

  const 전체경로 = path.join(process.cwd(), 'public', 상대경로);
  const 내용 = await readFile(전체경로);

  const 확장자 = path.extname(상대경로).toLowerCase();
  const 종류 = 확장자 === '.svg' ? 'image/svg+xml' : 확장자 === '.jpg' || 확장자 === '.jpeg' ? 'image/jpeg' : 'image/png';

  const 결과 = `data:${종류};base64,${내용.toString('base64')}`;
  기억해둠.set(상대경로, 결과);
  return 결과;
}

/** 수료증 상단에 넣는 세로형 로고. A4 세로 문서라 세로형이 좌우 대칭에 맞다. */
export function 수료증_로고() {
  return 그림_데이터URI('logo/logo-vertical.png');
}

/**
 * 사업단장 직인.
 *
 * **public 폴더에 두지 않는다.** 그 폴더의 파일은 주소만 알면 누구나 내려받을 수 있어,
 * 직인 이미지를 빼내 다른 문서에 붙이면 가짜 수료증이 된다.
 * 그래서 서버만 읽을 수 있는 private 폴더에 두고, PDF 안에만 넣는다.
 * Design Ref: prd_lite.md 기능 2 / DESIGN.md 4장
 *
 * 파일이 아직 없으면 null을 돌려준다. 그 경우 수료증에는 점선 자리만 찍힌다.
 */
export async function 사업단장_직인(): Promise<string | null> {
  const 경로 = path.join(process.cwd(), 'private', 'seal.png');
  try {
    const 내용 = await readFile(경로);
    return `data:image/png;base64,${내용.toString('base64')}`;
  } catch {
    return null;
  }
}
