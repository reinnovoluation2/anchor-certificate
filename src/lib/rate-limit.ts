// 시도 횟수를 제한한다.
//
// 두 곳에서 쓴다.
//  · 학생 조회 — 로그인이 없고 학번은 규칙성이 있어서, 이름만 바꿔가며 반복하면
//    명단을 훑을 수 있다.
//  · 담당자 로그인 — 비밀번호가 짧을수록 이 제한이 사실상 유일한 방어선이다.
//    네 자리 숫자는 제한이 없으면 몇 초 만에 전부 넣어볼 수 있다.
//
// Design Ref: DESIGN.md 4장 안전 장치 / prd_lite.md 기능 2

export const 한도표 = {
  /** 학생 조회: 10분에 10번 */
  조회: { 창_밀리초: 10 * 60 * 1000, 한도: 10 },
  /** 담당자 로그인: 10분에 5번 */
  로그인: { 창_밀리초: 10 * 60 * 1000, 한도: 5 },
} as const;

export type 용도 = keyof typeof 한도표;

type 기록 = { 횟수: number; 창시작: number };

// 서버가 살아 있는 동안만 기억한다.
// 서버가 여러 대로 늘어나면 각자 따로 세므로, 그때는 저장소로 옮겨야 한다.
const 기록들 = new Map<string, 기록>();

/** 너무 오래된 기록은 버린다. 기억이 무한정 쌓이지 않게. */
function 청소(지금: number) {
  if (기록들.size < 1000) return;
  const 가장긴창 = Math.max(...Object.values(한도표).map((v) => v.창_밀리초));
  for (const [열쇠, 값] of 기록들) {
    if (지금 - 값.창시작 > 가장긴창) 기록들.delete(열쇠);
  }
}

export type 시도결과 = { 막힘: false } | { 막힘: true; 남은분: number };

/**
 * 한 번 시도했다고 세고, 막을지 알려준다.
 * @param 누구 보통 접속한 곳의 주소(IP)
 * @param 용도 조회인지 로그인인지 (한도가 다르다)
 */
export function 시도_세기(누구: string, 용도: 용도 = '조회'): 시도결과 {
  const { 창_밀리초, 한도 } = 한도표[용도];
  const 지금 = Date.now();
  청소(지금);

  // 용도가 다르면 따로 센다. 조회를 많이 했다고 로그인이 막히면 안 된다.
  const 열쇠 = 용도 + ':' + 누구;
  const 이전 = 기록들.get(열쇠);

  // 처음이거나 창이 지났으면 새로 센다
  if (!이전 || 지금 - 이전.창시작 > 창_밀리초) {
    기록들.set(열쇠, { 횟수: 1, 창시작: 지금 });
    return { 막힘: false };
  }

  이전.횟수 += 1;
  if (이전.횟수 > 한도) {
    const 남은 = 창_밀리초 - (지금 - 이전.창시작);
    return { 막힘: true, 남은분: Math.max(1, Math.ceil(남은 / 60000)) };
  }

  return { 막힘: false };
}

/** 성공하면 센 것을 지운다. 제대로 쓰는 사람은 막지 않는다. */
export function 시도_지우기(누구: string, 용도: 용도 = '조회'): void {
  기록들.delete(용도 + ':' + 누구);
}

/** 요청이 어디서 왔는지 알아낸다. Vercel 뒤에 있을 때를 고려한다. */
export function 요청한_곳(요청: Request): string {
  const 헤더 = 요청.headers;
  const 앞단 = 헤더.get('x-forwarded-for');
  if (앞단) return 앞단.split(',')[0].trim();
  return 헤더.get('x-real-ip') ?? 'unknown';
}
