// 명단 서식 내려받기(1단계)와 채운 명단 올리기(2단계).
// Design Ref: DESIGN.md A2 화면

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type 오류 = { 줄번호: number; 메시지: string };

type 결과 =
  | {
      종류: '성공';
      처리: number;
      새로: number;
      덮어씀: number;
      예시줄_건너뜀: boolean;
      영문불가: string[];
    }
  | { 종류: '실패'; 메시지: string; 오류들: 오류[]; 오류_전체?: number };

// 화면 컴포넌트 이름은 영문 대문자로 시작해야 React가 컴포넌트로 인식한다
export default function RosterManager() {
  const router = useRouter();
  const 파일칸 = useRef<HTMLInputElement>(null);

  // 고른 파일을 바로 올리지 않고 여기 담아 둔다.
  // 담당자가 파일 이름을 눈으로 확인하고 [확인] 을 눌러야 올라간다.
  const [고른파일, set고른파일] = useState<File | null>(null);

  const [올리는중, set올리는중] = useState(false);
  const [결과, set결과] = useState<결과 | null>(null);
  const [끌어당김, set끌어당김] = useState(false);

  /** 파일을 고르기만 한다. 아직 올리지 않는다. */
  function 파일고르기(파일: File | undefined) {
    if (!파일) return;
    set결과(null);
    set고른파일(파일);
  }

  function 고른것_비우기() {
    set고른파일(null);
    if (파일칸.current) 파일칸.current.value = '';
  }

  /** [확인] 을 눌렀을 때 비로소 올린다. */
  async function 올리기() {
    if (!고른파일) return;

    set올리는중(true);
    set결과(null);
    try {
      const 폼 = new FormData();
      폼.append('file', 고른파일);
      const 응답 = await fetch('/api/admin/upload', { method: 'POST', body: 폼 });
      const 몸통 = await 응답.json();

      if (!응답.ok) {
        set결과({
          종류: '실패',
          메시지: 몸통.메시지 ?? '저장하지 않았습니다.',
          오류들: 몸통.오류들 ?? [],
          오류_전체: 몸통.오류_전체,
        });
        return;
      }

      set결과({
        종류: '성공',
        처리: 몸통.처리,
        새로: 몸통.새로,
        덮어씀: 몸통.덮어씀,
        예시줄_건너뜀: 몸통.예시줄_건너뜀,
        영문불가: 몸통.영문불가 ?? [],
      });
      고른것_비우기();
      router.refresh(); // 아래 "현재 저장된 명단" 숫자를 다시 불러온다
    } catch {
      set결과({
        종류: '실패',
        메시지: '지금은 서비스를 이용할 수 없습니다. 잠시 뒤 다시 시도해 주세요.',
        오류들: [],
      });
    } finally {
      set올리는중(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {/* ── 1단계 ─────────────────────────────────────────── */}
      <section className="rounded border border-[#e5e5e5] p-5">
        <h2 className="font-bold">1단계 &nbsp; 명단 서식 받기</h2>
        <p className="mt-1 text-sm text-[#555]">
          빈 엑셀 서식을 받아 채워 주세요. 둘째 줄 예시는 지우셔도 되고 그대로 두셔도 됩니다.
        </p>
        <a
          href="/api/admin/template"
          className="mt-3 inline-block rounded border border-[#862633] px-4 py-2 text-sm text-[#862633]"
        >
          엑셀 서식 내려받기
        </a>
      </section>

      {/* ── 2단계 ─────────────────────────────────────────── */}
      <section className="rounded border border-[#e5e5e5] p-5">
        <h2 className="font-bold">2단계 &nbsp; 채운 명단 올리기</h2>

        {!고른파일 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              set끌어당김(true);
            }}
            onDragLeave={() => set끌어당김(false)}
            onDrop={(e) => {
              e.preventDefault();
              set끌어당김(false);
              파일고르기(e.dataTransfer.files?.[0]);
            }}
            className={`mt-3 rounded border-2 border-dashed p-8 text-center text-sm ${
              끌어당김 ? 'border-[#862633] bg-[#fdf2f3]' : 'border-[#ccc]'
            }`}
          >
            <p className="text-[#555]">파일을 여기에 끌어다 놓거나</p>
            <button
              type="button"
              onClick={() => 파일칸.current?.click()}
              className="mt-3 rounded bg-[#862633] px-4 py-2 text-white"
            >
              파일 선택
            </button>
          </div>
        ) : (
          /* 파일을 고른 뒤 — 이름을 보여주고 확인을 받는다 */
          <div className="mt-3 rounded border border-[#ccc] p-5">
            <p className="text-sm text-[#555]">고른 파일</p>
            <p className="mt-1 break-all font-bold">{고른파일.name}</p>
            <p className="mt-1 text-xs text-[#555]">
              {(고른파일.size / 1024).toFixed(0)}KB
            </p>

            <p className="mt-4 text-sm leading-relaxed">
              이 파일로 명단을 덮어씁니다. 맞으면 <strong>확인</strong>을 눌러 주세요.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={올리기}
                disabled={올리는중}
                className="rounded bg-[#862633] px-5 py-2.5 text-white disabled:opacity-60"
              >
                {올리는중 ? '올리는 중…' : '확인'}
              </button>
              <button
                type="button"
                onClick={고른것_비우기}
                disabled={올리는중}
                className="rounded border border-[#ccc] px-5 py-2.5 text-sm text-[#555] disabled:opacity-60"
              >
                다시 고르기
              </button>
            </div>
          </div>
        )}

        {/* 파일 고르는 칸은 늘 있어야 한다. 화면에는 보이지 않는다. */}
        <input
          ref={파일칸}
          type="file"
          accept=".xlsx"
          hidden
          onChange={(e) => 파일고르기(e.target.files?.[0])}
        />
      </section>

      {/* ── 결과 ──────────────────────────────────────────── */}
      {결과 && (
        <section
          className={`rounded border p-5 text-sm ${
            결과.종류 === '성공' ? 'border-[#cfe3cf] bg-[#f5faf5]' : 'border-[#e8c4c8] bg-[#fdf2f3]'
          }`}
          role="status"
        >
          <h2 className="font-bold">결과</h2>

          {결과.종류 === '성공' ? (
            <>
              <p className="mt-2">
                ✅ {결과.처리}건 처리 — 새로 {결과.새로}건, 덮어쓴 것 {결과.덮어씀}건
              </p>
              {결과.예시줄_건너뜀 && (
                <p className="mt-1 text-xs text-[#555]">
                  서식의 예시 줄은 건너뛰었습니다.
                </p>
              )}
              {결과.영문불가.length > 0 && (
                <div className="mt-3 rounded bg-white/70 p-3">
                  <p className="font-bold text-[#8a6d00]">
                    ⚠ 영문 수료증 발급 불가 {결과.영문불가.length}개 프로그램
                  </p>
                  <ul className="mt-1 list-disc pl-5">
                    {결과.영문불가.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-[#555]">
                    프로그램 영문명이 비어 있습니다. 국문 수료증은 정상 발급됩니다.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="mt-2 font-bold text-[#862633]">❌ {결과.메시지}</p>
              {결과.오류들.length > 0 && (
                <>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5">
                    {결과.오류들.map((o, i) => (
                      <li key={`${o.줄번호}-${i}`}>
                        {o.줄번호}번째 줄 : {o.메시지}
                      </li>
                    ))}
                  </ul>
                  {결과.오류_전체 && 결과.오류_전체 > 결과.오류들.length && (
                    <p className="mt-1 text-xs text-[#555]">
                      … 그 밖에 {결과.오류_전체 - 결과.오류들.length}건 더 있습니다.
                    </p>
                  )}
                </>
              )}
              <p className="mt-3">파일을 고쳐서 다시 올려 주세요.</p>
              <p className="mt-1 text-xs text-[#555]">
                한 건도 저장되지 않았습니다.
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
