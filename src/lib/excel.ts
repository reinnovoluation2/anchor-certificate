// 엑셀 서식을 만들고, 올라온 엑셀을 읽는다.
//
// 항목 정의는 src/lib/roster.ts 한 곳에서만 가져온다.
// Design Ref: DESIGN.md 흐름 ① · ②

import ExcelJS from 'exceljs';
import { 헤더, 예시_줄, 단위과제_목록, type 원본줄 } from '@/lib/roster';

const 시트이름 = '수료자명단';

/**
 * 담당자가 내려받을 빈 서식을 만든다.
 * 첫 줄에 항목 이름, 둘째 줄에 채우는 법을 보여주는 예시 한 줄이 들어간다.
 */
export async function 빈_서식_만들기(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(시트이름);

  ws.addRow([...헤더]);
  ws.addRow([...예시_줄]);

  // 첫 줄은 굵게, 스크롤해도 붙어 있게
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // 예시 줄은 회색으로 흐리게 — 지워도 된다는 표시
  ws.getRow(2).font = { color: { argb: 'FF888888' }, italic: true };

  // 번호는 반드시 글자로 다뤄야 한다. 숫자로 저장되면 `01`이 `1`이 된다.
  for (const 열 of [1, 2, 3, 6]) {
    ws.getColumn(열).numFmt = '@';
  }

  const 너비 = [10, 14, 14, 34, 46, 14, 14, 18, 28];
  너비.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // 안내 시트 — 담당자가 무엇을 어떻게 채워야 하는지
  const 안내 = wb.addWorksheet('작성 안내');
  안내.addRow(['ANCHOR 수료자 명단 작성 안내']).font = { bold: true, size: 14 };
  안내.addRow([]);
  안내.addRow(['· 첫 줄(항목 이름)은 고치지 마세요. 이름이 다르면 업로드가 거부됩니다.']);
  안내.addRow(['· 둘째 줄은 예시입니다. 지우고 쓰셔도 되고, 그대로 두셔도 됩니다.']);
  안내.addRow(['· 단위과제번호와 프로그램번호는 앞의 0을 살려 두 자리로 적으세요. (예: 01)']);
  안내.addRow(['· 학번은 숫자 10자리입니다.']);
  안내.addRow(['· 프로그램 영문명만 비워둘 수 있습니다. 비우면 그 프로그램은 영문 수료증이 나가지 않습니다.']);
  안내.addRow(['· 잘못된 줄이 하나라도 있으면 한 건도 저장되지 않습니다.']);
  안내.addRow([]);
  안내.addRow(['쓸 수 있는 단위과제번호']).font = { bold: true };
  for (const t of 단위과제_목록) {
    안내.addRow([`${t.번호}  ${t.이름}`]);
  }
  안내.getColumn(1).width = 90;

  const 결과 = await wb.xlsx.writeBuffer();
  return Buffer.from(결과);
}

/** 엑셀에서 읽어낸 것. 검사는 아직 하지 않은 상태. */
export type 읽은결과 = {
  /** 헤더를 뺀 실제 값 줄들. 엑셀 화면의 줄 번호를 함께 들고 있다. */
  줄들: 원본줄[];
  /** 헤더가 서식과 다르면 그 이유 */
  헤더문제?: string;
  /** 예시 줄을 건너뛰었는지 */
  예시줄_건너뜀: boolean;
};

/** 엑셀 칸 하나를 글자로 바꾼다. 숫자로 저장된 `1`도 글자 `1`이 된다. */
function 칸을_글자로(값: ExcelJS.CellValue): string {
  if (값 === null || 값 === undefined) return '';
  if (typeof 값 === 'object' && 값 !== null) {
    // 수식이나 서식 있는 글자인 경우
    if ('text' in 값 && typeof 값.text === 'string') return 값.text.trim();
    if ('result' in 값) return String(값.result ?? '').trim();
    if ('richText' in 값 && Array.isArray(값.richText)) {
      return 값.richText.map((r) => r.text).join('').trim();
    }
  }
  return String(값).trim();
}

/**
 * 올라온 엑셀 파일을 읽는다.
 *
 * 하는 일은 세 가지뿐이다. 값이 맞는지 검사하는 것은 roster.ts 의 명단_검사가 한다.
 *   1. 첫 줄(항목 이름)이 서식과 같은지 본다
 *   2. 둘째 줄이 예시 줄이면 건너뛴다
 *   3. 나머지를 글자로 뽑아낸다
 */
export async function 엑셀_읽기(파일: ArrayBuffer): Promise<읽은결과> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(파일);

  // 시트 이름이 달라도 첫 번째 시트를 쓴다. 이름까지 맞추라고 하면 너무 까다롭다.
  const ws = wb.getWorksheet(시트이름) ?? wb.worksheets[0];
  if (!ws) {
    return { 줄들: [], 헤더문제: '시트를 찾을 수 없습니다', 예시줄_건너뜀: false };
  }

  const 뽑기 = (줄번호: number): string[] => {
    const row = ws.getRow(줄번호);
    const 칸들: string[] = [];
    for (let i = 1; i <= 헤더.length; i += 1) {
      칸들.push(칸을_글자로(row.getCell(i).value));
    }
    return 칸들;
  };

  // 1. 헤더 확인
  const 실제헤더 = 뽑기(1);
  for (let i = 0; i < 헤더.length; i += 1) {
    if (실제헤더[i] !== 헤더[i]) {
      return {
        줄들: [],
        헤더문제: `첫 줄 ${i + 1}번째 항목이 "${헤더[i]}"여야 하는데 "${실제헤더[i] || '(비어 있음)'}"입니다`,
        예시줄_건너뜀: false,
      };
    }
  }

  // 2. 둘째 줄이 예시 줄이면 건너뛴다
  const 둘째줄 = 뽑기(2);
  const 예시줄_건너뜀 = 예시_줄.every((v, i) => 둘째줄[i] === v);
  const 시작 = 예시줄_건너뜀 ? 3 : 2;

  // 3. 값 뽑아내기 (완전히 빈 줄은 무시)
  const 줄들: 원본줄[] = [];
  for (let n = 시작; n <= ws.rowCount; n += 1) {
    const 칸들 = 뽑기(n);
    if (칸들.every((c) => c === '')) continue;
    줄들.push({ 줄번호: n, 칸들 });
  }

  return { 줄들, 예시줄_건너뜀 };
}
