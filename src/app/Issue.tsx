// 학생 발급 흐름 — S1 조회 → S2 프로그램 선택 → S3 수료증 확인·다운로드
// Design Ref: DESIGN.md 1장

'use client';

import { useEffect, useRef, useState } from 'react';

type 프로그램 = {
  관리번호: string;
  해당연도: string;
  단위과제번호: string;
  단위과제명: string;
  프로그램번호: string;
  프로그램명: string;
  영문가능: boolean;
};

type 단계 =
  | { 이름: 'S1' }
  | { 이름: 'S2'; 학생이름: string; 프로그램들: 프로그램[] }
  | { 이름: 'S3'; 학생이름: string; 고른것: 프로그램; 언어: 'ko' | 'en' };

// 화면 컴포넌트 이름은 영문 대문자로 시작해야 React가 컴포넌트로 인식한다
export default function Issue() {
  const [단계, set단계] = useState<단계>({ 이름: 'S1' });
  const [학번, set학번] = useState('');
  const [이름, set이름] = useState('');
  const [오류, set오류] = useState('');
  const [기다림, set기다림] = useState(false);

  // ── S1 조회 ──────────────────────────────────────────────────
  async function 조회하기(e: React.FormEvent) {
    e.preventDefault();
    set오류('');
    set기다림(true);
    try {
      const 응답 = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: 학번, name: 이름 }),
      });
      const 몸통 = await 응답.json();

      if (!응답.ok) {
        set오류(몸통.메시지 ?? '조회하지 못했습니다.');
        return;
      }

      set단계({ 이름: 'S2', 학생이름: 몸통.이름, 프로그램들: 몸통.프로그램들 });
    } catch {
      set오류('지금은 서비스를 이용할 수 없습니다. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      set기다림(false);
    }
  }

  function 처음으로() {
    set단계({ 이름: 'S1' });
    set오류('');
    set학번('');
    set이름('');
  }

  // ── S1 화면 ──────────────────────────────────────────────────
  if (단계.이름 === 'S1') {
    return (
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold tracking-[0.2em] text-[#862633]">
          수료증 발급
        </h1>
        <hr className="mx-auto my-5 w-12 border-t border-[#862633]" />
        <p className="text-center text-sm leading-relaxed">
          ANCHOR사업 프로그램 수료증을
          <br />
          직접 발급받으실 수 있습니다.
        </p>

        <form onSubmit={조회하기} className="mt-8 space-y-4">
          <div>
            <label htmlFor="학번" className="block text-sm">학번</label>
            <input
              id="학번"
              value={학번}
              onChange={(e) => set학번(e.target.value)}
              inputMode="numeric"
              required
              className="mt-1 w-full rounded border border-[#ccc] px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="이름" className="block text-sm">이름</label>
            <input
              id="이름"
              value={이름}
              onChange={(e) => set이름(e.target.value)}
              required
              className="mt-1 w-full rounded border border-[#ccc] px-3 py-2"
            />
          </div>

          {오류 && (
            <p role="alert" className="rounded bg-[#fdf2f3] px-3 py-2 text-sm text-[#862633]">
              {오류}
            </p>
          )}

          <button
            type="submit"
            disabled={기다림}
            className="w-full rounded bg-[#862633] px-4 py-2.5 text-white disabled:opacity-60"
          >
            {기다림 ? '확인하는 중…' : '조회하기'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-[#555]">
          ※ 명단에 등록된 수료자만 발급받을 수 있습니다.
        </p>
      </div>
    );
  }

  // ── S2 화면 ──────────────────────────────────────────────────
  if (단계.이름 === 'S2') {
    return (
      <S2
        학생이름={단계.학생이름}
        프로그램들={단계.프로그램들}
        처음으로={처음으로}
        다음으로={(고른것, 언어) =>
          set단계({ 이름: 'S3', 학생이름: 단계.학생이름, 고른것, 언어 })
        }
      />
    );
  }

  // ── S3 화면 ──────────────────────────────────────────────────
  return (
    <S3
      고른것={단계.고른것}
      언어={단계.언어}
      뒤로={() =>
        set단계({ 이름: 'S2', 학생이름: 단계.학생이름, 프로그램들: [단계.고른것] })
      }
      처음으로={처음으로}
    />
  );
}

// ── S2. 프로그램 선택 ─────────────────────────────────────────

function S2({
  학생이름,
  프로그램들,
  다음으로,
  처음으로,
}: {
  학생이름: string;
  프로그램들: 프로그램[];
  다음으로: (고른것: 프로그램, 언어: 'ko' | 'en') => void;
  처음으로: () => void;
}) {
  const [고름, set고름] = useState(프로그램들[0]?.관리번호 ?? '');
  const [언어, set언어] = useState<'ko' | 'en'>('ko');

  const 고른것 = 프로그램들.find((p) => p.관리번호 === 고름);
  const 영문막힘 = 고른것 ? !고른것.영문가능 : false;

  // 영문을 고른 상태에서 영문 불가 프로그램으로 바꾸면 국문으로 되돌린다
  const 실제언어: 'ko' | 'en' = 영문막힘 ? 'ko' : 언어;

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="text-center text-lg">
        <strong>{학생이름}</strong> 님, 확인되었습니다.
      </p>
      <hr className="mx-auto my-5 w-12 border-t border-[#862633]" />

      <fieldset>
        <legend className="text-sm font-bold">수료한 프로그램을 선택하세요.</legend>
        <div className="mt-3 space-y-2">
          {프로그램들.map((p) => (
            <label
              key={p.관리번호}
              className={`flex cursor-pointer items-start gap-3 rounded border px-4 py-3 ${
                고름 === p.관리번호 ? 'border-[#862633] bg-[#fdf2f3]' : 'border-[#ddd]'
              }`}
            >
              <input
                type="radio"
                name="프로그램"
                value={p.관리번호}
                checked={고름 === p.관리번호}
                onChange={() => set고름(p.관리번호)}
                className="mt-1"
              />
              <span>
                <span className="text-sm text-[#555]">{p.해당연도}</span>{' '}
                <span>{p.프로그램명}</span>
                <span className="block text-xs text-[#888]">
                  {p.단위과제번호} {p.단위과제명} · 제 {p.관리번호} 호
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-sm font-bold">언어</legend>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="언어"
              checked={실제언어 === 'ko'}
              onChange={() => set언어('ko')}
            />
            국문
          </label>
          <label
            className={`flex items-center gap-2 ${영문막힘 ? 'text-[#aaa]' : ''}`}
          >
            <input
              type="radio"
              name="언어"
              disabled={영문막힘}
              checked={실제언어 === 'en'}
              onChange={() => set언어('en')}
            />
            English
          </label>
        </div>
        {영문막힘 && (
          <p className="mt-2 text-xs text-[#8a6d00]">
            이 프로그램은 영문 수료증을 준비 중입니다. 국문으로만 발급됩니다.
          </p>
        )}
      </fieldset>

      <button
        type="button"
        disabled={!고른것}
        onClick={() => 고른것 && 다음으로(고른것, 실제언어)}
        className="mt-8 w-full rounded bg-[#862633] px-4 py-2.5 text-white disabled:opacity-60"
      >
        수료증 확인
      </button>

      <button
        type="button"
        onClick={처음으로}
        className="mt-3 w-full rounded border border-[#ccc] px-4 py-2 text-sm text-[#555]"
      >
        처음으로
      </button>
    </div>
  );
}

// ── S3. 수료증 확인 · 다운로드 ────────────────────────────────

function S3({
  고른것,
  언어,
  뒤로,
  처음으로,
}: {
  고른것: 프로그램;
  언어: 'ko' | 'en';
  뒤로: () => void;
  처음으로: () => void;
}) {
  const [받는중, set받는중] = useState(false);
  const [오류, set오류] = useState('');

  // A4 한 장을 화면 폭에 맞춰 줄인다. 96dpi 기준 210mm = 794px, 297mm = 1123px.
  const A4폭 = 794;
  const A4높이 = 1123;
  const 상자 = useRef<HTMLDivElement>(null);
  const [배율, set배율] = useState(1);

  useEffect(() => {
    const 요소 = 상자.current;
    if (!요소) return;
    const 재기 = () => set배율(Math.min(1, 요소.clientWidth / A4폭));
    재기();
    const 지켜보기 = new ResizeObserver(재기);
    지켜보기.observe(요소);
    return () => 지켜보기.disconnect();
  }, []);

  const 미리보기주소 = `/api/certificate/preview?no=${encodeURIComponent(고른것.관리번호)}&lang=${언어}`;

  async function 받기() {
    set오류('');
    set받는중(true);
    try {
      const 응답 = await fetch(
        `/api/certificate/pdf?no=${encodeURIComponent(고른것.관리번호)}&lang=${언어}`,
      );
      if (!응답.ok) {
        const 몸통 = await 응답.json().catch(() => ({}));
        set오류(몸통.메시지 ?? '수료증을 만들지 못했습니다.');
        return;
      }

      // 서버가 정한 파일 이름을 그대로 쓴다
      const 붙임 = 응답.headers.get('Content-Disposition') ?? '';
      const 맞음 = 붙임.match(/filename\*=UTF-8''([^;]+)/);
      const 파일이름 = 맞음 ? decodeURIComponent(맞음[1]) : '수료증.pdf';

      const 덩어리 = await 응답.blob();
      const 주소 = URL.createObjectURL(덩어리);
      const a = document.createElement('a');
      a.href = 주소;
      a.download = 파일이름;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(주소);
    } catch {
      set오류('지금은 서비스를 이용할 수 없습니다. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      set받는중(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[820px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={뒤로}
          className="rounded border border-[#ccc] px-4 py-2 text-sm text-[#555]"
        >
          ← 다시 선택
        </button>
        <button
          type="button"
          onClick={받기}
          disabled={받는중}
          className="rounded bg-[#862633] px-5 py-2.5 text-white disabled:opacity-60"
        >
          {받는중 ? '만드는 중…' : 'PDF 받기'}
        </button>
      </div>

      {오류 && (
        <p role="alert" className="mt-3 rounded bg-[#fdf2f3] px-3 py-2 text-sm text-[#862633]">
          {오류}
        </p>
      )}

      {/* A4 비율을 유지한 채 화면 폭에 맞춰 줄여 보여준다 (DESIGN.md 휴대폰에서의 S3) */}
      <div ref={상자} className="mt-4 overflow-hidden rounded border border-[#e5e5e5]">
        <div style={{ height: A4높이 * 배율, position: "relative" }}>
          <iframe
            title="수료증 미리보기"
            src={미리보기주소}
            className="absolute left-0 top-0 origin-top-left border-0"
            style={{
              width: A4폭,
              height: A4높이,
              transform: `scale(${배율})`,
            }}
          />
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-[#555]">
        화면에는 직인이 없습니다. 내려받은 PDF에 직인이 찍혀 나옵니다.
      </p>

      <button
        type="button"
        onClick={처음으로}
        className="mt-6 w-full rounded border border-[#ccc] px-4 py-2 text-sm text-[#555]"
      >
        처음으로
      </button>

    </div>
  );
}
