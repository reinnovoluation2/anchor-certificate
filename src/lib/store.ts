// 수료자 명단을 어디에 보관하고 어떻게 꺼내는지.
//
// 보관 장소는 두 가지다. 쓰는 쪽 코드는 어느 쪽인지 몰라도 된다.
//   · Supabase — .env 에 SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 있으면 이쪽을 쓴다
//   · 파일     — 없으면 .data/roster.json 에 넣는다 (내 컴퓨터에서 개발할 때)
//
// Vercel은 서버에 파일을 쓸 수 없으므로, 배포할 때는 반드시 Supabase 값이 있어야 한다.
// Design Ref: DESIGN.md 3-2 / PLAN.md 전제

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { 명단줄, 명단줄_열쇠, 이름_맞추기 } from '@/lib/roster';

export type 저장결과 = { 새로: number; 덮어씀: number };

export interface 명단저장소 {
  /** 어디에 담고 있는지 (화면에 알려주기 위한 이름) */
  이름: string;
  /** 명단 전체를 통째로 넣는다. 같은 열쇠면 덮어쓴다. */
  넣기(줄들: 명단줄[]): Promise<저장결과>;
  /** 저장된 전부를 꺼낸다. */
  전부(): Promise<명단줄[]>;
  /** 학번과 이름이 모두 맞는 줄만 꺼낸다. */
  찾기(학번: string, 이름: string): Promise<명단줄[]>;

  /** 설정값 하나를 읽는다. 없으면 null. */
  설정_읽기(열쇠: string): Promise<string | null>;
  /** 설정값 하나를 넣는다. */
  설정_쓰기(열쇠: string, 값: string): Promise<void>;
}

// ── 파일 저장 (개발용) ──────────────────────────────────────────

const 파일경로 = path.join(process.cwd(), '.data', 'roster.json');
const 설정경로 = path.join(process.cwd(), '.data', 'settings.json');

class 파일저장소 implements 명단저장소 {
  이름 = '파일(.data/roster.json)';

  private async 읽기(): Promise<명단줄[]> {
    try {
      const 글자 = await readFile(파일경로, 'utf8');
      return JSON.parse(글자) as 명단줄[];
    } catch {
      // 아직 한 번도 저장하지 않았으면 빈 명단이다.
      return [];
    }
  }

  private async 쓰기(줄들: 명단줄[]): Promise<void> {
    await mkdir(path.dirname(파일경로), { recursive: true });
    await writeFile(파일경로, JSON.stringify(줄들, null, 2), 'utf8');
  }

  async 넣기(줄들: 명단줄[]): Promise<저장결과> {
    const 기존 = await this.읽기();
    const 지도 = new Map(기존.map((r) => [명단줄_열쇠(r), r]));

    let 새로 = 0;
    let 덮어씀 = 0;
    for (const 줄 of 줄들) {
      const 열쇠 = 명단줄_열쇠(줄);
      if (지도.has(열쇠)) 덮어씀 += 1;
      else 새로 += 1;
      지도.set(열쇠, 줄);
    }

    await this.쓰기([...지도.values()]);
    return { 새로, 덮어씀 };
  }

  async 전부(): Promise<명단줄[]> {
    return this.읽기();
  }

  async 찾기(학번: string, 이름: string): Promise<명단줄[]> {
    const 맞춘이름 = 이름_맞추기(이름);
    const 전부 = await this.읽기();
    return 전부.filter(
      (r) => r.학번 === 학번 && 이름_맞추기(r.국문_이름) === 맞춘이름,
    );
  }

  private async 설정_전부(): Promise<Record<string, string>> {
    try {
      return JSON.parse(await readFile(설정경로, "utf8")) as Record<string, string>;
    } catch {
      return {};
    }
  }

  async 설정_읽기(열쇠: string): Promise<string | null> {
    const 전부 = await this.설정_전부();
    return 전부[열쇠] ?? null;
  }

  async 설정_쓰기(열쇠: string, 값: string): Promise<void> {
    const 전부 = await this.설정_전부();
    전부[열쇠] = 값;
    await mkdir(path.dirname(설정경로), { recursive: true });
    await writeFile(설정경로, JSON.stringify(전부, null, 2), "utf8");
  }
}

// ── Supabase 저장 (배포용) ──────────────────────────────────────

/**
 * Supabase에 붙는다. 표 이름은 roster.
 *
 * 준비되면 .env 에 아래 두 값을 넣으면 자동으로 이쪽을 쓴다.
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 서비스 키는 서버에서만 쓴다. 화면 쪽 코드로 넘어가면 안 된다.
 */
class Supabase저장소 implements 명단저장소 {
  이름 = 'Supabase';

  constructor(
    private url: string,
    private key: string,
  ) {}

  private async 부르기(경로: string, 옵션: RequestInit = {}): Promise<Response> {
    return fetch(`${this.url}/rest/v1/${경로}`, {
      ...옵션,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        ...(옵션.headers ?? {}),
      },
      cache: 'no-store',
    });
  }

  async 넣기(줄들: 명단줄[]): Promise<저장결과> {
    // 무엇이 새것이고 무엇이 덮어쓴 것인지 세기 위해 먼저 기존 열쇠를 가져온다.
    const 기존 = await this.전부();
    const 기존열쇠 = new Set(기존.map(명단줄_열쇠));

    let 새로 = 0;
    let 덮어씀 = 0;
    for (const 줄 of 줄들) {
      if (기존열쇠.has(명단줄_열쇠(줄))) 덮어씀 += 1;
      else 새로 += 1;
    }

    const 응답 = await this.부르기('roster', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(줄들),
    });

    if (!응답.ok) {
      throw new Error(`명단을 저장하지 못했습니다 (${응답.status})`);
    }

    return { 새로, 덮어씀 };
  }

  async 전부(): Promise<명단줄[]> {
    const 응답 = await this.부르기('roster?select=*');
    if (!응답.ok) throw new Error(`명단을 불러오지 못했습니다 (${응답.status})`);
    return (await 응답.json()) as 명단줄[];
  }

  async 찾기(학번: string, 이름: string): Promise<명단줄[]> {
    // 이름은 공백을 무시해 비교해야 하므로, 학번으로 좁힌 뒤 여기서 거른다.
    const 응답 = await this.부르기(`roster?학번=eq.${encodeURIComponent(학번)}&select=*`);
    if (!응답.ok) throw new Error(`명단을 불러오지 못했습니다 (${응답.status})`);
    const 줄들 = (await 응답.json()) as 명단줄[];

    const 맞춘이름 = 이름_맞추기(이름);
    return 줄들.filter((r) => 이름_맞추기(r.국문_이름) === 맞춘이름);
  }

  // 설정은 settings 표에 열쇠·값 한 쌍으로 넣는다
  async 설정_읽기(열쇠: string): Promise<string | null> {
    const 응답 = await this.부르기(
      `settings?key=eq.${encodeURIComponent(열쇠)}&select=value`,
    );
    if (!응답.ok) return null;
    const 줄들 = (await 응답.json()) as Array<{ value: string }>;
    return 줄들[0]?.value ?? null;
  }

  async 설정_쓰기(열쇠: string, 값: string): Promise<void> {
    const 응답 = await this.부르기('settings', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ key: 열쇠, value: 값 }]),
    });
    if (!응답.ok) throw new Error(`설정을 저장하지 못했습니다 (${응답.status})`);
  }
}

// ── 어느 것을 쓸지 고르기 ───────────────────────────────────────

let 고른것: 명단저장소 | null = null;

export function 저장소(): 명단저장소 {
  if (고른것) return 고른것;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  고른것 = url && key ? new Supabase저장소(url, key) : new 파일저장소();
  return 고른것;
}
